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
    'رفع الملف',
    'تعيين الأعمدة',
    'معاينة البيانات',
    'تنفيذ الاستيراد',
  ];

  const productFields = [
    { key: 'name', label: 'اسم المنتج', required: true },
    { key: 'sku', label: 'رمز المنتج (SKU)', required: false },
    { key: 'scientific_name', label: 'الاسم العلمي', required: false },
    { key: 'stock_quantity', label: 'الكمية بالمخزون', required: false },
  ];

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      setError('نوع الملف غير مدعوم، الرجاء استخدام ملف Excel (xlsx أو xls)');
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
      setError(err instanceof Error ? err.message : 'فشل في رفع الملف، يرجى المحاولة مرة أخرى.');
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
        setError('بعض الحقول الإلزامية لم يتم تعيينها، يرجى إكمال التعيين.');
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
      setError(err instanceof Error ? err.message : t('products:import.previewError'));
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
      let errorMessage = 'حدث خطأ أثناء تنفيذ عملية الاستيراد.';
      
      if (err instanceof Error) {
        // Handle specific error types
        if (err.message.includes('timeout') || err.message.includes('Network Error')) {
          errorMessage = 'انتهت مهلة الاستيراد، الرجاء المحاولة لاحقًا أو استخدام ملف أصغر.';
        } else if (err.message.includes('413')) {
          errorMessage = 'حجم الملف كبير جدًا، الرجاء استخدام ملف Excel أصغر.';
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
        اختر ملف Excel يحتوي على المنتجات التي تريد استيرادها.
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
          رفع ملف المنتجات
        </Typography>
        <Typography variant="body2" color="text.secondary">
          الصيغ المدعومة: ‎.xlsx, ‎.xls
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
          تم اختيار الملف: {file.name}
        </Alert>
      )}
    </Box>
  );

  const renderStep2 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        قم بتعيين أعمدة ملف Excel إلى حقول المنتج.
      </Typography>
      
      {autoMapped && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            تم تعيين الأعمدة تلقائيًا بناءً على الأسماء، يرجى المراجعة والتعديل إذا لزم الأمر.
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
          label="تجاهل صف العناوين في أول الصفوف"
        />
        
        <Button
          variant="outlined"
          size="small"
          onClick={handleAutoMap}
          sx={{ ml: 'auto' }}
        >
          تعيين الأعمدة تلقائيًا
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
              <TableCell>حقل المنتج</TableCell>
              <TableCell>عمود Excel</TableCell>
              <TableCell>إلزامي</TableCell>
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
                        <em>اختر عمودًا</em>
                      </MenuItem>
                      <MenuItem value="skip">تجاهل هذا الحقل</MenuItem>
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
  );

  const renderStep3 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        معاينة البيانات التي سيتم استيرادها قبل التنفيذ.
      </Typography>
      
      {previewLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            يتم توليد المعاينة...
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
                  <TableCell>{t('products:fields.name')}</TableCell>
                  <TableCell>{t('products:fields.sku')}</TableCell>
                  <TableCell>{t('products:fields.scientificName')}</TableCell>
                  <TableCell>{t('products:fields.stockQuantity')}</TableCell>
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
            يتم عرض أول 10 صفوف فقط. إجمالي الصفوف التي سيتم استيرادها: {previewData.length}
          </Typography>
        </Box>
      )}
      
      {!previewLoading && previewData.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          لا توجد بيانات للمعاينة، يرجى التحقق من تعيين الأعمدة.
        </Alert>
      )}
    </Box>
  );

  const renderStep4 = () => (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        راجع تفاصيل الاستيراد ثم قم بتأكيد العملية.
      </Typography>
      
      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            يتم تنفيذ عملية الاستيراد...
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
            قد تستغرق العملية عدة دقائق مع الملفات الكبيرة، يرجى عدم إغلاق هذه الشاشة.
          </Typography>
        </Box>
      )}
      
      {importResult && !loading && (
        <Alert severity={importResult.errors === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            تم استيراد {importResult.imported} صفًا، مع وجود {importResult.errors} صفوف بها أخطاء.
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
          <Typography variant="h6">استيراد المنتجات من ملف Excel</Typography>
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
          {activeStep === 3 ? 'إغلاق' : 'إلغاء'}
        </Button>

        {/* Back button: show on steps 1 and 2 (activeStep > 0) */}
        {activeStep > 0 && (
          <Button onClick={handleBack}>
            رجوع
          </Button>
        )}
        
        {activeStep === 1 && (
          <Button onClick={handleNext} variant="contained">
            التالي
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button onClick={handleNext} variant="contained">
            التالي
          </Button>
        )}
        
        {activeStep === 3 && !importResult && (
          <Button onClick={handleImport} variant="contained" disabled={loading}>
            {loading ? 'جاري الاستيراد...' : 'تنفيذ الاستيراد'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ProductImportDialog; 