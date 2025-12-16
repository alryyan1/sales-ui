// src/pages/PurchaseFormPage.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useForm,
  FormProvider,
  SubmitHandler,
  useWatch,
} from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// Import Child Components
import { PurchaseHeaderFormSection } from "../components/purchases/PurchaseHeaderFormSection";
import { PurchaseItemsList } from "../components/purchases/PurchaseItemsList";
import PurchaseItemsImportDialog from "../components/purchases/PurchaseItemsImportDialog";

// MUI Components
import {
  Button,
  Card,
  CardContent,
  Divider,
  Alert,
  AlertTitle,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Paper,
  Chip,
  Container,
  Fade,
  Skeleton,
} from "@mui/material";
import { ArrowLeft, AlertCircle, FileText, Upload, CheckCircle2 } from "lucide-react";

// Services and Types
import purchaseService, {
  CreatePurchaseData,
  UpdatePurchaseData,
} from "../services/purchaseService";
import supplierService, { Supplier } from "../services/supplierService";
import productService, { Product } from "../services/productService";
import exportService from "../services/exportService";
import { formatNumber, preciseCalculation } from "@/constants";
import apiClient from "@/lib/axios";

// --- Type Definitions ---
export type PurchaseFormValues = {
  supplier_id: number;
  purchase_date: Date;
  status: "received" | "pending" | "ordered";
  reference_number?: string | null;
  notes?: string | null;
  items: PurchaseItemFormValues[];
};

export type PurchaseItemFormValues = {
  id?: number | null;
  product_id: number;
  product?: Product;
  batch_number?: string | null;
  quantity: number;
  unit_cost: number;
  sale_price?: number | null;
  expiry_date?: Date | null;
  total_sellable_units_display?: number;
  cost_per_sellable_unit_display?: number;
};

// --- Component ---
const PurchaseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: purchaseIdParam } = useParams<{ id?: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const isEditMode = Boolean(purchaseId);

  // --- State ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingData, setLoadingData] = useState(isEditMode);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  // Search States
  const [supplierSearchInput, setSupplierSearchInput] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  const supplierDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSupplierSearchRef = useRef<string>("");
  
  // Selected objects for display
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // --- React Hook Form Setup ---
  const formMethods = useForm<PurchaseFormValues>({
    defaultValues: {
      supplier_id: undefined as any,
      purchase_date: new Date(),
      status: "pending" as const,
      reference_number: "",
      notes: "",
      items: isEditMode ? [
        {
          product_id: 0,
          batch_number: "",
          quantity: 1,
          unit_cost: 0,
          sale_price: null,
          expiry_date: null,
          product: undefined,
        },
      ] : [],
    },
    mode: "onChange",
  });
  
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    setError,
    control,
  } = formMethods;

  // Memoized watched items to prevent unnecessary re-renders
  const watchedItems = useWatch({ control, name: "items" });
  
  // Watch purchase status to determine if items can be modified
  const watchedStatus = useWatch({ control, name: "status" });
  const isPurchaseReceived = watchedStatus === "received";
  
  // Memoized grand total calculation
  const grandTotal = useMemo(() => 
    watchedItems?.reduce(
      (total, item) =>
        preciseCalculation(total, preciseCalculation(Number(item?.quantity) || 0, Number(item?.unit_cost) || 0, 'multiply', 2), 'add', 2),
      0
    ) ?? 0,
    [watchedItems]
  );

  // --- Initial suppliers load (for dropdown opening with data) ---
  useEffect(() => {
    const loadInitialSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const response = await supplierService.getSuppliers(1, "");
        setSuppliers(response.data ?? []);
      } catch (error) {
        console.error("Failed to load initial suppliers:", error);
        toast.error("خطأ", {
          description: supplierService.getErrorMessage(error),
        });
      } finally {
        setLoadingSuppliers(false);
      }
    };

    loadInitialSuppliers();
  }, []);

  // --- Debounce Effects ---
  useEffect(() => {
    if (supplierDebounceRef.current) clearTimeout(supplierDebounceRef.current);
    supplierDebounceRef.current = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearchInput);
    }, 300);
    return () => {
      if (supplierDebounceRef.current)
        clearTimeout(supplierDebounceRef.current);
    };
  }, [supplierSearchInput]);
  
  // Memoized supplier search effect
  useEffect(() => {
    if (debouncedSupplierSearch !== '' && debouncedSupplierSearch !== lastSupplierSearchRef.current) {
      lastSupplierSearchRef.current = debouncedSupplierSearch;
      
      const searchSuppliers = async () => {
        setLoadingSuppliers(true);
        try {
          const response = await apiClient.get<{ data: Supplier[] }>(
            `/suppliers?search=${encodeURIComponent(debouncedSupplierSearch)}&limit=15`
          );
          setSuppliers((response.data as any).data ?? response.data);
        } catch (error) {
          toast.error("خطأ", {
            description: supplierService.getErrorMessage(error),
          });
          setSuppliers([]);
        } finally {
          setLoadingSuppliers(false);
        }
      };
      searchSuppliers();
    }
  }, [debouncedSupplierSearch]);

  // --- Fetch Existing Purchase Data for Edit Mode ---
  useEffect(() => {
    const loadPurchaseData = async (id: number) => {
      setLoadingData(true);
      setServerError(null);
      try {
        const existingPurchase = await purchaseService.getPurchase(id);
        if (!existingPurchase.items)
          throw new Error("Purchase items missing in API response.");

        // Pre-fetch related data for display
        const initialSupplier = existingPurchase.supplier_id
          ? await supplierService
              .getSupplier(existingPurchase.supplier_id)
              .catch(() => null)
          : null;

        const productIds = existingPurchase.items.map(
          (item) => item.product_id
        );
        let initialProducts: Product[] = [];
        if (productIds.length > 0) {
          try {
            initialProducts = await productService.getProductsByIds(productIds);
          } catch (error) {
            console.error("Failed to fetch products by IDs:", error);
            initialProducts = [];
          }
        }
        
        const safeInitialProducts = Array.isArray(initialProducts) ? initialProducts : [];

        if (initialSupplier)
          setSuppliers((prev) =>
            prev.find((s) => s.id === initialSupplier.id)
              ? prev
              : [initialSupplier, ...prev]
          );
        setSelectedSupplier(initialSupplier);

        const initialProductMap = safeInitialProducts.reduce((map, prod) => {
          map[prod.id] = prod;
          return map;
        }, {} as Record<number, Product>);

        reset({
          supplier_id: existingPurchase.supplier_id ?? undefined,
          purchase_date: existingPurchase.purchase_date
            ? parseISO(existingPurchase.purchase_date)
            : new Date(),
          status: existingPurchase.status,
          reference_number: existingPurchase.reference_number || "",
          notes: existingPurchase.notes || "",
          items: existingPurchase.items.map((item) => ({
            id: item.id,
            product_id: item.product_id,
            product: initialProductMap[item.product_id],
            batch_number: item.batch_number || "",
            quantity: Number(item.quantity) || 1,
            unit_cost: Number(item.unit_cost) || 0,
            sale_price:
              item.sale_price !== null ? Number(item.sale_price) : null,
            expiry_date: item.expiry_date ? parseISO(item.expiry_date) : null,
          })),
        });
      } catch (err) {
        console.error("Failed to load purchase data:", err);
        const errorMsg = purchaseService.getErrorMessage(err);
        setError("root", { type: "manual", message: errorMsg });
        toast.error("خطأ", { description: errorMsg });
        navigate("/purchases");
      } finally {
        setLoadingData(false);
      }
    };

    if (isEditMode && purchaseId) {
      loadPurchaseData(purchaseId);
    } else {
      setLoadingData(false);
    }
  }, [isEditMode, purchaseId, reset, navigate, setError]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<PurchaseFormValues> = useCallback(async (data) => {
    setServerError(null);
    
    // Manual validation
    if (!data.supplier_id || data.supplier_id <= 0) {
      setError("supplier_id", { type: "manual", message: "يرجى اختيار مورد" });
      return;
    }
    
    if (!data.purchase_date) {
      setError("purchase_date", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    
    if (!data.status) {
      setError("status", { type: "manual", message: "هذا الحقل مطلوب" });
      return;
    }
    
    // Validate items for edit mode
    if (isEditMode && (!data.items || data.items.length === 0)) {
      setError("items", { type: "manual", message: "يجب إضافة عنصر واحد على الأقل" });
      return;
    }
    
    // Validate each item
    let hasItemErrors = false;
    if (data.items && data.items.length > 0) {
      data.items.forEach((item, index) => {
        if (!item.product_id || item.product_id <= 0) {
          setError(`items.${index}.product_id` as any, { type: "manual", message: "يرجى اختيار منتج" });
          hasItemErrors = true;
        }
        if (!item.quantity || item.quantity < 1) {
          setError(`items.${index}.quantity` as any, { type: "manual", message: "الحد الأدنى للكمية هو 1" });
          hasItemErrors = true;
        }
        if (item.batch_number && item.batch_number.length > 100) {
          setError(`items.${index}.batch_number` as any, { type: "manual", message: "الحد الأقصى 100 حرف" });
          hasItemErrors = true;
        }
        if (item.unit_cost < 0) {
          setError(`items.${index}.unit_cost` as any, { type: "manual", message: "يجب أن يكون أكبر من أو يساوي صفر" });
          hasItemErrors = true;
        }
        if (item.sale_price !== null && item.sale_price !== undefined && item.sale_price < 0) {
          setError(`items.${index}.sale_price` as any, { type: "manual", message: "يجب أن يكون أكبر من أو يساوي صفر" });
          hasItemErrors = true;
        }
      });
      
      if (hasItemErrors) {
        setServerError("يرجى التحقق من الحقول");
        return;
      }
    }
    const apiData: CreatePurchaseData | UpdatePurchaseData = {
      ...data,
      purchase_date: format(data.purchase_date as Date, "yyyy-MM-dd"),
      items: (data.items || []).map((item) => ({
        id: isEditMode ? item.id : undefined,
        product_id: item.product_id,
        batch_number: item.batch_number || null,
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost),
        sale_price:
          item.sale_price !== null && item.sale_price !== undefined
            ? Number(item.sale_price)
            : null,
        expiry_date: item.expiry_date
          ? format(item.expiry_date as Date, "yyyy-MM-dd")
          : null,
      })),
    };
    
    console.log(
      `Submitting ${isEditMode ? "Update" : "Create"} Purchase:`,
      apiData
    );
    
    try {
      let createdPurchase: any;
      if (isEditMode && purchaseId) {
        await purchaseService.updatePurchase(
          purchaseId,
          apiData as UpdatePurchaseData
        );
      } else {
        createdPurchase = await purchaseService.createPurchase(apiData as CreatePurchaseData);
      }
      
      toast.success("نجح", {
        description: "تم حفظ المشتريات بنجاح",
      });
      
      // For new purchases, redirect to manage items page to add products
      if (!isEditMode && createdPurchase?.purchase?.id) {
        navigate(`/purchases/${createdPurchase.purchase.id}/manage-items`);
      } else {
        navigate("/purchases", {
          state: { updatedPurchaseId: isEditMode ? purchaseId : undefined },
        });
      }
    } catch (err) {
      console.error(
        `Failed to ${isEditMode ? "update" : "create"} purchase:`,
        err
      );
      const generalError = purchaseService.getErrorMessage(err);
      const apiErrors = purchaseService.getValidationErrors(err);
      toast.error("خطأ", { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([key, messages]) => {
          const match = key.match(/^items\.(\d+)\.(.+)$/);
          if (match) {
            const [, index, fieldName] = match;
            setError(
              `items.${index}.${fieldName}` as keyof PurchaseFormValues,
              { type: "server", message: messages[0] }
            );
          } else if (key in ({} as PurchaseFormValues)) {
            setError(key as keyof PurchaseFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });
        setServerError("يرجى التحقق من الحقول");
      }
    }
  }, [isEditMode, purchaseId, navigate, setError]);

  // --- PDF Export Handler ---
  const handleViewPdf = useCallback(async () => {
    if (!purchaseId) return;
    
    try {
      await exportService.exportPurchasePdf(purchaseId);
    } catch (err) {
      toast.error("خطأ", {
        description: err instanceof Error ? err.message : "فشل فتح ملف PDF",
      });
    }
  }, [purchaseId]);

  // --- Import Success Handler ---
  const handleImportSuccess = useCallback(async () => {
    if (!purchaseId) return;
    
    try {
      const existingPurchase = await purchaseService.getPurchase(purchaseId);
      if (!existingPurchase.items)
        throw new Error("Purchase items missing in API response.");

      const initialSupplier = existingPurchase.supplier_id
        ? await supplierService
            .getSupplier(existingPurchase.supplier_id)
            .catch(() => null)
        : null;

      const productIds = existingPurchase.items.map(
        (item) => item.product_id
      );
      let initialProducts: Product[] = [];
      if (productIds.length > 0) {
        try {
          initialProducts = await productService.getProductsByIds(productIds);
        } catch (error) {
          console.error("Failed to fetch products by IDs:", error);
          initialProducts = [];
        }
      }
      
      const safeInitialProducts = Array.isArray(initialProducts) ? initialProducts : [];

      if (initialSupplier)
        setSuppliers((prev) =>
          prev.find((s) => s.id === initialSupplier.id)
            ? prev
            : [initialSupplier, ...prev]
        );
      setSelectedSupplier(initialSupplier);

      const initialProductMap = safeInitialProducts.reduce((map, prod) => {
        map[prod.id] = prod;
        return map;
      }, {} as Record<number, Product>);

      reset({
        supplier_id: existingPurchase.supplier_id ?? undefined,
        purchase_date: existingPurchase.purchase_date
          ? parseISO(existingPurchase.purchase_date)
          : new Date(),
        status: existingPurchase.status,
        reference_number: existingPurchase.reference_number || "",
        notes: existingPurchase.notes || "",
        items: existingPurchase.items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          product: initialProductMap[item.product_id],
          batch_number: item.batch_number || "",
          quantity: Number(item.quantity) || 1,
          unit_cost: Number(item.unit_cost) || 0,
          sale_price:
            item.sale_price !== null ? Number(item.sale_price) : null,
          expiry_date: item.expiry_date ? parseISO(item.expiry_date) : null,
        })),
      });
    } catch (err) {
      console.error("Failed to load purchase data:", err);
      const errorMsg = purchaseService.getErrorMessage(err);
      setError("root", { type: "manual", message: errorMsg });
      toast.error("خطأ", { description: errorMsg });
    }
  }, [purchaseId, reset, setError]);

  if (loadingData && isEditMode) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: 'grey.50',
      pb: 6,
      pt: { xs: 2, sm: 3 }
    }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Fade in timeout={300}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 3,
              p: { xs: 2.5, sm: 3, md: 4 },
              mb: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(250,250,250,1) 100%)'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 3
            }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5, flex: 1 }}>
                <IconButton
                  onClick={() => navigate("/purchases")}
                  sx={{ 
                    bgcolor: 'grey.100',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'primary.light',
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      transform: 'translateX(-2px)'
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  <ArrowLeft size={20} />
                </IconButton>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Typography 
                      variant="h4" 
                      component="h1"
                      sx={{ 
                        fontWeight: 800,
                        fontSize: { xs: '1.5rem', sm: '1.875rem', md: '2.25rem' },
                        color: 'text.primary',
                        lineHeight: 1.2,
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {isEditMode ? "تعديل مشتريات" : "إضافة مشتريات جديدة"}
                    </Typography>
                    {isEditMode && purchaseId && (
                      <Chip
                        label={`#${purchaseId}`}
                        size="small"
                        sx={{
                          bgcolor: 'primary.50',
                          color: 'primary.main',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24
                        }}
                      />
                    )}
                  </Box>
                  {isPurchaseReceived && (
                    <Box sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      bgcolor: 'warning.50',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'warning.200',
                      width: 'fit-content'
                    }}>
                      <AlertCircle size={16} style={{ color: '#ed6c02' }} />
                      <Typography 
                        variant="body2"
                        sx={{ 
                          color: 'warning.dark',
                          fontWeight: 600,
                          fontSize: '0.8125rem'
                        }}
                      >
                        تم استلام هذه المشتريات - للقراءة فقط
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5, 
                flexWrap: 'wrap',
                width: { xs: '100%', sm: 'auto' },
                justifyContent: { xs: 'flex-start', sm: 'flex-end' }
              }}>
                {isEditMode && purchaseId && !isPurchaseReceived && (
                  <Button
                    variant="outlined"
                    onClick={() => setIsImportDialogOpen(true)}
                    startIcon={<Upload size={18} />}
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      px: 2.5,
                      '&:hover': {
                        borderColor: 'primary.dark',
                        bgcolor: 'primary.50',
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    استيراد العناصر
                  </Button>
                )}
                
                {isEditMode && purchaseId && (
                  <Button
                    variant="outlined"
                    onClick={handleViewPdf}
                    startIcon={<FileText size={18} />}
                    sx={{ 
                      textTransform: 'none',
                      fontWeight: 600,
                      borderColor: 'grey.300',
                      color: 'text.secondary',
                      px: 2.5,
                      '&:hover': {
                        borderColor: 'grey.400',
                        bgcolor: 'grey.50',
                        transform: 'translateY(-1px)',
                        boxShadow: 1
                      },
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    عرض PDF
                  </Button>
                )}
                
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || (loadingData && isEditMode)}
                  size="large"
                  onClick={handleSubmit(onSubmit)}
                  startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircle2 size={18} />}
                  sx={{ 
                    textTransform: 'none', 
                    fontWeight: 700,
                    px: 4,
                    py: 1.25,
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                    '&:hover': {
                      boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)',
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      boxShadow: 'none'
                    },
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {isSubmitting 
                    ? "جاري الحفظ..."
                    : isEditMode
                      ? "تحديث المشتريات"
                      : "إنشاء المشتريات"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Main Form Card */}
        <Fade in timeout={400}>
          <Card sx={{ 
            bgcolor: 'background.paper',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider'
          }}>
            <FormProvider {...formMethods}>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                  {serverError && !isSubmitting && (
                    <Fade in>
                      <Alert 
                        severity="error" 
                        icon={<AlertCircle size={22} />}
                        sx={{ 
                          mb: 4,
                          borderRadius: 2,
                          bgcolor: 'error.50',
                          border: '1px solid',
                          borderColor: 'error.200',
                          '& .MuiAlert-icon': {
                            color: 'error.main'
                          },
                          '& .MuiAlert-message': {
                            width: '100%'
                          }
                        }}
                      >
                        <AlertTitle sx={{ fontWeight: 700, mb: 0.5, fontSize: '1rem' }}>
                          خطأ في التحقق
                        </AlertTitle>
                        <Typography variant="body2" sx={{ color: 'error.dark' }}>
                          {serverError}
                        </Typography>
                      </Alert>
                    </Fade>
                  )}

                  {/* Header Form Section */}
                  <PurchaseHeaderFormSection
                    suppliers={suppliers}
                    loadingSuppliers={loadingSuppliers}
                    supplierSearchInput={supplierSearchInput}
                    onSupplierSearchInputChange={setSupplierSearchInput}
                    isSubmitting={isSubmitting}
                    selectedSupplier={selectedSupplier}
                    onSupplierSelect={setSelectedSupplier}
                    isPurchaseReceived={isPurchaseReceived}
                  />
                 
                  {/* Items Section for Edit Mode */}
                  {isEditMode && (
                    <>
                      <Divider sx={{ my: 5, borderColor: 'divider' }} />
                      <PurchaseItemsList
                        isSubmitting={isSubmitting}
                        isPurchaseReceived={isPurchaseReceived}
                      />
                      <Divider sx={{ my: 5, borderColor: 'divider' }} />
                  
                      {/* Totals Display */}
                      <Fade in timeout={300}>
                        <Paper
                          elevation={0}
                          sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 3,
                            p: { xs: 2.5, sm: 3 },
                            bgcolor: 'grey.50',
                            borderRadius: 2,
                            border: '2px solid',
                            borderColor: 'primary.200',
                            background: 'linear-gradient(to left, rgba(25, 118, 210, 0.04) 0%, transparent 100%)'
                          }}
                        >
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              color: 'text.secondary', 
                              fontWeight: 600,
                              fontSize: '1rem'
                            }}
                          >
                            الإجمالي الكلي:
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography 
                              variant="h4" 
                              sx={{ 
                                fontWeight: 800, 
                                color: 'primary.main',
                                fontSize: { xs: '1.5rem', sm: '2rem' },
                                letterSpacing: '-0.02em'
                              }}
                            >
                              {formatNumber(grandTotal)}
                            </Typography>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: 'text.secondary',
                                fontWeight: 500,
                                fontSize: '0.875rem'
                              }}
                            >
                              ر.س
                            </Typography>
                          </Box>
                        </Paper>
                      </Fade>
                    </>
                  )}
                </CardContent>
              </form>
            </FormProvider>
          </Card>
        </Fade>
      </Container>

        {/* Purchase Items Import Dialog */}
        {isEditMode && purchaseId && (
          <PurchaseItemsImportDialog
            open={isImportDialogOpen}
            onClose={() => setIsImportDialogOpen(false)}
            purchaseId={purchaseId}
            onImportSuccess={() => {
              handleImportSuccess();
              setIsImportDialogOpen(false);
              toast.success("نجح", {
                description: "تم استيراد العناصر بنجاح",
              });
            }}
          />
        )}
      </Box>
    );
  };

export default PurchaseFormPage;
