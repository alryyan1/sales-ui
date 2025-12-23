import React, { useState, useRef, useCallback, useMemo } from 'react';
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
  LinearProgress,
} from '@mui/material';
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
  const [importProgress, setImportProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    'رفع الملف',
    'تعيين الأعمدة',
    'معاينة البيانات',
    'تأكيد الاستيراد',
  ];

  const purchaseItemFields = [
    { key: 'product_name', label: 'اسم المنتج', required: true },
    { key: 'product_sku', label: 'رمز المنتج', required: false },
    { key: 'batch_number', label: 'رقم الدفعة', required: false },
    { key: 'quantity', label: 'الكمية', required: true },
    { key: 'unit_cost', label: 'تكلفة الوحدة', required: true },
    { key: 'sale_price', label: 'سعر البيع', required: false },
    { key: 'expiry_date', label: 'تاريخ الانتهاء', required: false },
  ];

  // Memoized handlers to prevent unnecessary re-renders
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      setError('نوع الملف غير صحيح. يرجى اختيار ملف Excel (.xlsx أو .xls)');
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
      setError(err instanceof Error ? err.message : 'فشل في رفع الملف');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleColumnMappingChange = useCallback((field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleAutoMap = useCallback(() => {
    const autoMappedColumns = autoMapColumns(headers);
    setColumnMapping(autoMappedColumns);
    setAutoMapped(true);
  }, [headers]);

  const handleNext = useCallback(async () => {
    if (activeStep === 1) {
      // Validate required fields are mapped
      const requiredFields = purchaseItemFields.filter(field => field.required);
      const unmappedRequired = requiredFields.filter(field => !columnMapping[field.key as keyof ColumnMapping]);
      
      if (unmappedRequired.length > 0) {
        setError('يجب تعيين جميع الحقول المطلوبة');
        return;
      }
      
      // Generate preview data
      await handlePreview();
      setActiveStep(2);
    } else if (activeStep === 2) {
      setActiveStep(3);
    }
  }, [activeStep, columnMapping, purchaseItemFields]);

  const handleBack = useCallback(() => {
    setActiveStep(prev => prev - 1);
  }, []);

  const handlePreview = useCallback(async () => {
    if (!file) return;

    setPreviewLoading(true);
    setError(null);

    try {
      const result = await purchaseService.importPurchaseItemsPreview(file, columnMapping, skipHeader);
      setPreviewData(result.preview || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في إنشاء المعاينة');
    } finally {
      setPreviewLoading(false);
    }
  }, [file, columnMapping, skipHeader]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setImportProgress(0);

    try {
      // Simulate progress updates for large imports
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 1000);

      const result = await purchaseService.importPurchaseItemsStep2(file, columnMapping, skipHeader, purchaseId);
      
      clearInterval(progressInterval);
      setImportProgress(100);
      
      setImportResult(result);
      onImportSuccess();
    } catch (err) {
      let errorMessage = 'فشل في معالجة الاستيراد';
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('timeout') || err.message.includes('Network Error')) {
          errorMessage = 'انتهت مهلة الاستيراد. يرجى المحاولة بملف أصغر أو التحقق من الاتصال.';
        } else if (err.message.includes('413')) {
          errorMessage = 'الملف كبير جداً. يرجى استخدام ملف Excel أصغر.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [file, columnMapping, skipHeader, purchaseId, onImportSuccess, t]);

  const handleClose = useCallback(() => {
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
    setImportProgress(0);
    onClose();
  }, [onClose]);

  // Memoized render functions for better performance
  const renderStep1 = useMemo(() => (
    <Box>
      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary', lineHeight: 1.6 }}>
        قم بتحميل ملف Excel يحتوي على بيانات عناصر الشراء
      </Typography>
      
      <Box
        sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 3,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: 'grey.50',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'primary.light',
            '& .upload-icon': {
              color: 'primary.main'
            }
          },
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <CloudUploadIcon 
          className="upload-icon"
          sx={{ 
            fontSize: 64, 
            color: 'text.secondary', 
            mb: 2,
            transition: 'color 0.2s ease-in-out'
          }} 
        />
        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
          رفع ملف Excel
        </Typography>
        <Typography variant="body2" color="text.secondary">
          الصيغ المدعومة: .xlsx, .xls
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
        <Alert 
          severity="success" 
          sx={{ 
            mt: 3,
            borderRadius: 2,
            border: 1,
            borderColor: 'success.main'
          }}
        >
          تم اختيار الملف: {file.name}
        </Alert>
      )}
    </Box>
  ), [handleFileSelect, file]);

  const renderStep2 = useMemo(() => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        قم بتعيين أعمدة Excel مع حقول عناصر الشراء
      </Typography>
      
      {autoMapped && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            تم تعيين الأعمدة تلقائياً بناءً على التشابه. يرجى المراجعة والتعديل إذا لزم الأمر.
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
          label="تخطي صف الرأس"
        />
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleAutoMap}
          sx={{ ml: 'auto' }}
        >
          تعيين الأعمدة تلقائياً
        </Button>
      </Box>
      
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight: 400,
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          boxShadow: 1
        }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>
                حقل عنصر الشراء
              </TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>
                عمود Excel
              </TableCell>
              <TableCell sx={{ fontWeight: 600, bgcolor: 'grey.100' }}>
                مطلوب
              </TableCell>
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
                        <em>اختر العمود</em>
                      </MenuItem>
                      <MenuItem value="skip">تخطي</MenuItem>
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
                      مطلوب
                    </Typography>
                  ) : (
                    <Typography color="text.secondary" variant="caption">
                      اختياري
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  ), [autoMapped, skipHeader, handleAutoMap, columnMapping, headers, handleColumnMappingChange, purchaseItemFields]);

  const renderStep3 = useMemo(() => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        معاينة البيانات التي سيتم استيرادها
      </Typography>
      
      {previewLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            جاري إنشاء المعاينة...
          </Typography>
        </Box>
      )}
      
      {!previewLoading && previewData.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            معاينة البيانات (أول 10 صفوف)
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>اسم المنتج</TableCell>
                  <TableCell>رمز المنتج</TableCell>
                  <TableCell>رقم الدفعة</TableCell>
                  <TableCell>الكمية</TableCell>
                  <TableCell>تكلفة الوحدة</TableCell>
                  <TableCell>سعر البيع</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
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
            عرض أول 10 صفوف. إجمالي الصفوف للاستيراد: {previewData.length}
          </Typography>
        </Box>
      )}
      
      {!previewLoading && previewData.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          لم يتم العثور على بيانات للمعاينة. يرجى التحقق من تعيين الأعمدة.
        </Alert>
      )}
    </Box>
  ), [previewLoading, previewData]);

  const renderStep4 = useMemo(() => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        راجع وأكد الاستيراد
      </Typography>
      
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            جاري معالجة الاستيراد...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
            قد يستغرق هذا بضع دقائق للملفات الكبيرة. يرجى عدم إغلاق هذا الحوار.
          </Typography>
          <Box sx={{ width: '100%', maxWidth: 400 }}>
            <LinearProgress variant="determinate" value={importProgress} />
            <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              {Math.round(importProgress)}% مكتمل
            </Typography>
          </Box>
        </Box>
      )}
      
      {importResult && !loading && (
        <Alert severity={importResult.errors === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            تم استيراد {importResult.imported} عنصر بنجاح. {importResult.errors > 0 && `حدثت ${importResult.errors} أخطاء.`}
          </Typography>
        </Alert>
      )}
      
      {importResult?.errorDetails && importResult.errorDetails.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            تفاصيل الأخطاء
          </Typography>
          <TableContainer component={Paper} sx={{ maxHeight: 200 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الصف</TableCell>
                  <TableCell>الأخطاء</TableCell>
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
  ), [loading, importProgress, importResult]);

  const renderStepContent = useMemo(() => {
    switch (activeStep) {
      case 0:
        return renderStep1;
      case 1:
        return renderStep2;
      case 2:
        return renderStep3;
      case 3:
        return renderStep4;
      default:
        return null;
    }
  }, [activeStep, renderStep1, renderStep2, renderStep3, renderStep4]);

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: 4
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2,
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50'
      }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            استيراد عناصر الشراء
          </Typography>
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              '& .MuiStepLabel-root .Mui-completed': {
                color: 'success.main'
              },
              '& .MuiStepLabel-root .Mui-active': {
                color: 'primary.main'
              }
            }}
          >
            {steps.map((label, index) => (
              <Step key={label} completed={index < activeStep}>
                <StepLabel 
                  sx={{
                    '& .MuiStepLabel-label': {
                      fontSize: '0.75rem',
                      fontWeight: index === activeStep ? 600 : 400
                    }
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, mt: 2 }}>
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
              border: 1,
              borderColor: 'error.main'
            }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>خطأ</AlertTitle>
            {error}
          </Alert>
        )}
        
        {loading && activeStep !== 3 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={48} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              جاري التحميل
            </Typography>
          </Box>
        )}
        
        {!loading && renderStepContent}
      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3,
        pt: 2,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
        gap: 1
      }}>
        <Button 
          onClick={handleClose}
          sx={{ textTransform: 'none', fontWeight: 500 }}
        >
          {activeStep === 3 ? 'إغلاق' : 'إلغاء'}
        </Button>

        {activeStep > 0 && (
          <Button 
            onClick={handleBack}
            variant="outlined"
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            رجوع
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button 
            onClick={handleNext} 
            variant="contained"
            sx={{ 
              textTransform: 'none', 
              fontWeight: 600,
              px: 3,
              boxShadow: 2
            }}
          >
            التالي
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button 
            onClick={handleNext} 
            variant="contained"
            sx={{ 
              textTransform: 'none', 
              fontWeight: 600,
              px: 3,
              boxShadow: 2
            }}
          >
            التالي
          </Button>
        )}
        
        {activeStep === 3 && !importResult && (
          <Button 
            onClick={handleImport} 
            variant="contained" 
            disabled={loading}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 600,
              px: 3,
              boxShadow: 2
            }}
          >
            {loading ? 'جاري الاستيراد...' : 'استيراد'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PurchaseItemsImportDialog; 