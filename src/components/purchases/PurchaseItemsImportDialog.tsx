import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import purchaseService from '../../services/purchaseService';

interface PurchaseItemsImportDialogProps {
  open: boolean;
  onClose: () => void;
  purchaseId: number;
  onImportSuccess: () => void;
}

interface ColumnMapping {
  product_name: string;
  product_sku: string;
  batch_number: string;
  quantity: string;
  unit_cost: string;
  sale_price: string;
  expiry_date: string;
}

// Function to calculate similarity between two strings
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Exact match
  if (s1 === s2) return 1.0;
  
  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Word-based similarity
  const words1 = s1.split(/[\s\-_]+/);
  const words2 = s2.split(/[\s\-_]+/);
  
  let commonWords = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 && word1.length > 2) {
        commonWords++;
      }
    }
  }
  
  if (commonWords > 0) {
    return commonWords / Math.max(words1.length, words2.length);
  }
  
  // Character-based similarity (Levenshtein distance approximation)
  let matches = 0;
  const minLength = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLength; i++) {
    if (s1[i] === s2[i]) matches++;
  }
  
  return matches / Math.max(s1.length, s2.length);
};

// Function to automatically map columns based on similarity
const autoMapColumns = (headers: string[]): ColumnMapping => {
  const fieldMappings = {
    product_name: ['product name', 'product_name', 'name', 'item name', 'item_name', 'product', 'item'],
    product_sku: ['product sku', 'product_sku', 'sku', 'product code', 'product_code', 'code', 'barcode'],
    batch_number: ['batch number', 'batch_number', 'batch', 'lot number', 'lot_number', 'lot'],
    quantity: ['quantity', 'qty', 'amount', 'stocking quantity', 'stocking_quantity', 'units'],
    unit_cost: ['unit cost', 'unit_cost', 'cost', 'price', 'unit price', 'unit_price', 'cost per unit'],
    sale_price: ['sale price', 'sale_price', 'selling price', 'selling_price', 'retail price', 'retail_price'],
    expiry_date: ['expiry date', 'expiry_date', 'expiry', 'expiration date', 'expiration_date', 'expiration', 'expires']
  };

  const mapping: ColumnMapping = {
    product_name: '',
    product_sku: '',
    batch_number: '',
    quantity: '',
    unit_cost: '',
    sale_price: '',
    expiry_date: '',
  };

  // For each field, find the best matching header
  Object.entries(fieldMappings).forEach(([field, possibleNames]) => {
    let bestMatch = '';
    let bestScore = 0;

    headers.forEach(header => {
      // Check against all possible names for this field
      possibleNames.forEach(possibleName => {
        const score = calculateSimilarity(header, possibleName);
        if (score > bestScore && score > 0.3) { // Minimum threshold of 0.3
          bestScore = score;
          bestMatch = header;
        }
      });
    });

    if (bestMatch) {
      mapping[field as keyof ColumnMapping] = bestMatch;
    }
  });

  return mapping;
};

const PurchaseItemsImportDialog: React.FC<PurchaseItemsImportDialogProps> = ({
  open,
  onClose,
  purchaseId,
  onImportSuccess,
}) => {
  const { t } = useTranslation(['purchases', 'common']);
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    product_name: '',
    product_sku: '',
    batch_number: '',
    quantity: '',
    unit_cost: '',
    sale_price: '',
    expiry_date: '',
  });
  const [skipHeader, setSkipHeader] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors: number;
    errorDetails: any[];
  } | null>(null);
  const [autoMapped, setAutoMapped] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    t('purchases:import.step1'),
    t('purchases:import.step2'),
    t('purchases:import.step3'),
    t('purchases:import.step4'),
  ];

  const purchaseItemFields = [
    { key: 'product_name', label: t('purchases:fields.productName'), required: true },
    { key: 'product_sku', label: t('purchases:fields.productSku'), required: false },
    { key: 'batch_number', label: t('purchases:fields.batchNumber'), required: false },
    { key: 'quantity', label: t('purchases:fields.quantity'), required: true },
    { key: 'unit_cost', label: t('purchases:fields.unitCost'), required: true },
    { key: 'sale_price', label: t('purchases:fields.salePrice'), required: false },
    { key: 'expiry_date', label: t('purchases:fields.expiryDate'), required: false },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      setError(t('purchases:import.invalidFileType'));
      return;
    }

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const result = await purchaseService.importPurchaseItemsStep1(selectedFile);
      setHeaders(result.headers);
      
      // Auto-map columns based on similarity
      const autoMappedColumns = autoMapColumns(result.headers);
      setColumnMapping(autoMappedColumns);
      setAutoMapped(true);
      
      setActiveStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('purchases:import.uploadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleColumnMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAutoMap = () => {
    const autoMappedColumns = autoMapColumns(headers);
    setColumnMapping(autoMappedColumns);
    setAutoMapped(true);
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      // Validate required fields are mapped
      const requiredFields = purchaseItemFields.filter(field => field.required);
      const unmappedRequired = requiredFields.filter(field => !columnMapping[field.key as keyof ColumnMapping]);
      
      if (unmappedRequired.length > 0) {
        setError(t('purchases:import.requiredFieldsNotMapped'));
        return;
      }
      
      // Generate preview data
      await handlePreview();
      setActiveStep(2);
    } else if (activeStep === 2) {
      setActiveStep(3);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handlePreview = async () => {
    if (!file) return;

    setPreviewLoading(true);
    setError(null);

    try {
      const result = await purchaseService.importPurchaseItemsPreview(file, columnMapping, skipHeader);
      setPreviewData(result.preview || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('purchases:import.previewError'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await purchaseService.importPurchaseItemsStep2(file, columnMapping, skipHeader, purchaseId);
      setImportResult(result);
      onImportSuccess();
    } catch (err) {
      let errorMessage = t('purchases:import.processError');
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('timeout') || err.message.includes('Network Error')) {
          errorMessage = t('purchases:import.timeoutError') || 'Import timed out. Please try with a smaller file or check your connection.';
        } else if (err.message.includes('413')) {
          errorMessage = t('purchases:import.fileTooLarge') || 'File is too large. Please use a smaller Excel file.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setHeaders([]);
    setColumnMapping({
      product_name: '',
      product_sku: '',
      batch_number: '',
      quantity: '',
      unit_cost: '',
      sale_price: '',
      expiry_date: '',
    });
    setSkipHeader(true);
    setError(null);
    setImportResult(null);
    setAutoMapped(false);
    setPreviewData([]);
    onClose();
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('purchases:import.step1Description')}
      </Typography>
      
      <Box
        sx={{
          border: '2px dashed #ccc',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          '&:hover': {
            borderColor: 'primary.main',
          },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          {t('purchases:import.uploadFile')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('purchases:import.supportedFormats')}
        </Typography>
      </Box>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      {file && (
        <Alert severity="success" sx={{ mt: 2 }}>
          {t('purchases:import.fileSelected', { fileName: file.name })}
        </Alert>
      )}
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('purchases:import.step2Description')}
      </Typography>
      
      {autoMapped && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('purchases:import.autoMappedMessage') || 'Columns have been automatically mapped based on similarity. Please review and adjust if needed.'}
          </Typography>
        </Alert>
      )}
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={skipHeader}
              onChange={(e) => setSkipHeader(e.target.checked)}
            />
          }
          label={t('purchases:import.skipHeaderRow')}
        />
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleAutoMap}
          sx={{ ml: 'auto' }}
        >
          {t('purchases:import.autoMapColumns') || 'Auto-Map Columns'}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            console.log('Current mapping:', columnMapping);
            console.log('Headers:', headers);
            console.log('Purchase item fields:', purchaseItemFields);
          }}
          sx={{ ml: 1 }}
        >
          Debug
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('purchases:import.purchaseItemField')}</TableCell>
              <TableCell>{t('purchases:import.excelColumn')}</TableCell>
              <TableCell>{t('purchases:import.required')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {purchaseItemFields.map((field) => (
              <TableRow key={field.key}>
                <TableCell>{field.label}</TableCell>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={columnMapping[field.key as keyof ColumnMapping]}
                      onChange={(e) => handleColumnMappingChange(field.key as keyof ColumnMapping, e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="">
                        <em>{t('purchases:import.selectColumn')}</em>
                      </MenuItem>
                      <MenuItem value="skip">{t('purchases:import.skipColumn')}</MenuItem>
                      {headers.map((header) => (
                        <MenuItem key={header} value={header}>
                          {header}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  {field.required ? (
                    <Typography color="error" variant="caption">
                      {t('common:required')}
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" variant="caption">
                      {t('common:optional')}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('purchases:import.step3Description') || 'Preview the data that will be imported'}
      </Typography>
      
      {previewLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {t('purchases:import.generatingPreview') || 'Generating Preview...'}
          </Typography>
        </Box>
      )}
      
      {!previewLoading && previewData.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('purchases:import.previewTitle') || 'Preview Data (First 10 rows)'}
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('purchases:fields.productName')}</TableCell>
                  <TableCell>{t('purchases:fields.productSku')}</TableCell>
                  <TableCell>{t('purchases:fields.batchNumber')}</TableCell>
                  <TableCell>{t('purchases:fields.quantity')}</TableCell>
                  <TableCell>{t('purchases:fields.unitCost')}</TableCell>
                  <TableCell>{t('purchases:fields.salePrice')}</TableCell>
                  <TableCell>{t('purchases:fields.expiryDate')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.product_name || '-'}</TableCell>
                    <TableCell>{row.product_sku || '-'}</TableCell>
                    <TableCell>{row.batch_number || '-'}</TableCell>
                    <TableCell>{row.quantity || '-'}</TableCell>
                    <TableCell>{row.unit_cost || '-'}</TableCell>
                    <TableCell>{row.sale_price || '-'}</TableCell>
                    <TableCell>{row.expiry_date || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('purchases:import.previewNote', { count: previewData.length }) || 'Showing first 10 rows. Total rows to import: ' + previewData.length}
          </Typography>
        </Box>
      )}
      
      {!previewLoading && previewData.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('purchases:import.noPreviewData') || 'No data found to preview. Please check your column mapping.'}
        </Alert>
      )}
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('purchases:import.step4Description') || 'Review and confirm the import'}
      </Typography>
      
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {t('purchases:import.processing') || 'Processing Import...'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {t('purchases:import.processingDescription') || 'This may take a few minutes for large files. Please do not close this dialog.'}
          </Typography>
        </Box>
      )}
      
      {importResult && !loading && (
        <Alert severity={importResult.errors === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('purchases:import.result', {
              imported: importResult.imported,
              errors: importResult.errors,
            })}
          </Typography>
        </Alert>
      )}
      
      {importResult?.errorDetails && importResult.errorDetails.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('purchases:import.errorDetails')}
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('purchases:import.row')}</TableCell>
                  <TableCell>{t('purchases:import.errors')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importResult.errorDetails.slice(0, 10).map((error, index) => (
                  <TableRow key={index}>
                    <TableCell>{error.row}</TableCell>
                    <TableCell>
                      {Object.entries(error.errors).map(([field, messages]) => (
                        <Typography key={field} variant="caption" display="block">
                          {field}: {Array.isArray(messages) ? messages.join(', ') : messages}
                        </Typography>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderStep1();
      case 1:
        return renderStep2();
      case 2:
        return renderStep3();
      case 3:
        return renderStep4();
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">{t('purchases:import.title')}</Typography>
          <Stepper activeStep={activeStep} sx={{ flex: 1, mx: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        )}
        
        {!loading && renderStepContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          {activeStep === 3 ? t('common:close') : t('common:cancel')}
        </Button>

        {/* Back button: show on steps 1, 2, and 3 (activeStep > 0) */}
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            {t('common:back')}
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button onClick={handleNext} variant="contained">
            {t('common:next')}
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button onClick={handleNext} variant="contained">
            {t('common:next')}
          </Button>
        )}
        
        {activeStep === 3 && !importResult && (
          <Button onClick={handleImport} variant="contained" disabled={loading}>
            {loading ? t('common:importing') : t('common:import')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseItemsImportDialog; 