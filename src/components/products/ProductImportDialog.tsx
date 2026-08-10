import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import productService from '../../services/productService';

interface ProductImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ColumnMapping {
  name: string;
  sku: string;
  scientific_name: string;
  stock_quantity: string;
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
    name: ['name', 'product name', 'product_name', 'title', 'product title', 'item name', 'item_name'],
    sku: ['sku', 'product sku', 'product_sku', 'code', 'product code', 'product_code', 'barcode', 'item code', 'item_code'],
    scientific_name: ['scientific name', 'scientific_name', 'scientific', 'generic name', 'generic_name'],
    stock_quantity: ['stock quantity', 'stock_quantity', 'quantity', 'qty', 'stock', 'inventory', 'available', 'stock level', 'stock_level']
  };

  const mapping: ColumnMapping = {
    name: '',
    sku: '',
    scientific_name: '',
    stock_quantity: '',
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

const ProductImportDialog: React.FC<ProductImportDialogProps> = ({
  open,
  onClose,
  onImportSuccess,
}) => {
  const { t } = useTranslation('products');
  const { t: tImport } = useTranslation('productImportDialog');
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    sku: '',
    scientific_name: '',
    stock_quantity: '',
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
    t('import.step1'),
    t('import.step2'),
    t('import.step3'),
    t('import.step4'),
  ];

  const productFields = [
    { key: 'name', label: t('fields.name'), required: true },
    { key: 'sku', label: t('fields.sku'), required: false },
    { key: 'scientific_name', label: t('fields.scientificName'), required: false },
    { key: 'stock_quantity', label: t('fields.stockQuantity'), required: false },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      setError(t('import.invalidFileType'));
      return;
    }

    setFile(selectedFile);
    setError(null);
    setLoading(true);

    try {
      const result = await productService.importProductsStep1(selectedFile);
      setHeaders(result.headers);
      
      // Auto-map columns based on similarity
      const autoMappedColumns = autoMapColumns(result.headers);
      setColumnMapping(autoMappedColumns);
      setAutoMapped(true);
      
      setActiveStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.uploadError'));
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
      const requiredFields = productFields.filter(field => field.required);
      const unmappedRequired = requiredFields.filter(field => !columnMapping[field.key as keyof ColumnMapping]);
      
      if (unmappedRequired.length > 0) {
        setError(t('import.requiredFieldsNotMapped'));
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
      const result = await productService.importProductsPreview(file, columnMapping, skipHeader);
      setPreviewData(result.preview || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('import.previewError'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const result = await productService.importProductsStep2(file, columnMapping, skipHeader);
      setImportResult(result);
      onImportSuccess();
    } catch (err) {
      let errorMessage = t('import.processError');

      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('timeout') || err.message.includes('Network Error')) {
          errorMessage = t('import.timeoutError');
        } else if (err.message.includes('413')) {
          errorMessage = t('import.fileTooLarge');
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
      name: '',
      sku: '',
      scientific_name: '',
      stock_quantity: '',
    });
    setSkipHeader(true);
    setError(null);
    setImportResult(null);
    setAutoMapped(false);
    onClose();
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('import.step1Description')}
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
          {t('import.uploadFile')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('import.supportedFormats')}
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
          {t('import.fileSelected', { fileName: file.name })}
        </Alert>
      )}
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('import.step2Description')}
      </Typography>

      {autoMapped && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('import.autoMappedMessage')}
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
          label={t('import.skipHeaderRow')}
        />

        <Button
          variant="outlined"
          size="small"
          onClick={handleAutoMap}
          sx={{ ml: 'auto' }}
        >
          {t('import.autoMapColumns')}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={() => {
            console.log('Current mapping:', columnMapping);
            console.log('Headers:', headers);
            console.log('Product fields:', productFields);
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
              <TableCell>{t('import.productField')}</TableCell>
              <TableCell>{t('import.excelColumn')}</TableCell>
              <TableCell>{t('import.required')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productFields.map((field) => (
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
                        <em>{t('import.selectColumn')}</em>
                      </MenuItem>
                      <MenuItem value="skip">{t('import.skipColumn')}</MenuItem>
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
                      {t('import.required')}
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" variant="caption">
                      {tImport('optional')}
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
        {t('import.step3Description')}
      </Typography>

      {previewLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {t('import.generatingPreview')}
          </Typography>
        </Box>
      )}

      {!previewLoading && previewData.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {t('import.previewTitle')}
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('fields.name')}</TableCell>
                  <TableCell>{t('fields.sku')}</TableCell>
                  <TableCell>{t('fields.scientificName')}</TableCell>
                  <TableCell>{t('fields.stockQuantity')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name || '-'}</TableCell>
                    <TableCell>{row.sku || '-'}</TableCell>
                    <TableCell>{row.scientific_name || '-'}</TableCell>
                    <TableCell>{row.stock_quantity || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('import.previewNote', { count: previewData.length })}
          </Typography>
        </Box>
      )}

      {!previewLoading && previewData.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('import.noPreviewData')}
        </Alert>
      )}
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('import.step4Description')}
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            {t('import.processing')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            {t('import.processingDescription')}
          </Typography>
        </Box>
      )}

      {importResult && !loading && (
        <Alert severity={importResult.errors === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            {t('import.result', { imported: importResult.imported, errors: importResult.errors })}
          </Typography>
        </Alert>
      )}

      {importResult?.errorDetails && importResult.errorDetails.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('import.errorDetails')}
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('import.row')}</TableCell>
                  <TableCell>{t('import.errors')}</TableCell>
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
          <Typography variant="h6">{t('import.title')}</Typography>
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
          {activeStep === 3 ? tImport('close') : t('cancel')}
        </Button>

        {/* Back button: show on steps 1 and 2 (activeStep > 0) */}
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            {tImport('back')}
          </Button>
        )}

        {activeStep === 1 && (
          <Button onClick={handleNext} variant="contained">
            {tImport('next')}
          </Button>
        )}

        {activeStep === 2 && (
          <Button onClick={handleNext} variant="contained">
            {tImport('next')}
          </Button>
        )}

        {activeStep === 3 && !importResult && (
          <Button onClick={handleImport} variant="contained" disabled={loading}>
            {loading ? tImport('importingButton') : tImport('executeImport')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductImportDialog; 