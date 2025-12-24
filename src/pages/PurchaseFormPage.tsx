// src/pages/PurchaseFormPage.tsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
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

// Lucide Icons
import {
  ArrowRight,
  AlertCircle,
  FileText,
  Upload,
  Save,
  CheckCircle,
  ShoppingCart,
  Package,
  Loader2,
} from "lucide-react";

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
import { warehouseService, Warehouse } from "../services/warehouseService";

// --- Type Definitions ---
export type PurchaseFormValues = {
  warehouse_id: number;
  supplier_id: number;
  purchase_date: Date;
  status: "received" | "pending" | "ordered";
  currency: "SDG" | "USD";
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
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null
  );

  // Warehouse State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  // --- React Hook Form Setup ---
  const formMethods = useForm<PurchaseFormValues>({
    defaultValues: {
      warehouse_id: 1,
      supplier_id: undefined as any,
      purchase_date: new Date(),
      status: "pending" as const, // Default "pending"
      currency: "SDG" as "SDG" | "USD",
      reference_number: "",
      notes: "",
      items: isEditMode
        ? [
            {
              product_id: 0,
              batch_number: "",
              quantity: 1,
              unit_cost: 0,
              sale_price: null,
              expiry_date: null,
              product: undefined,
            },
          ]
        : [],
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

  const watchedItems = useWatch({ control, name: "items" });
  const watchedStatus = useWatch({ control, name: "status" });
  // const isPurchaseReceived = watchedStatus === "received";
  const isPurchaseReceived = false; // Logic disabled as per request: allow editing even if received

  // Memoized grand total calculation
  const grandTotal = useMemo(
    () =>
      watchedItems?.reduce(
        (total, item) =>
          preciseCalculation(
            total,
            preciseCalculation(
              Number(item?.quantity) || 0,
              Number(item?.unit_cost) || 0,
              "multiply",
              2
            ),
            "add",
            2
          ),
        0
      ) ?? 0,
    [watchedItems]
  );

  // --- Initial suppliers load ---
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

  useEffect(() => {
    if (
      debouncedSupplierSearch !== "" &&
      debouncedSupplierSearch !== lastSupplierSearchRef.current
    ) {
      lastSupplierSearchRef.current = debouncedSupplierSearch;
      const searchSuppliers = async () => {
        setLoadingSuppliers(true);
        try {
          const response = await apiClient.get<{ data: Supplier[] }>(
            `/suppliers?search=${encodeURIComponent(
              debouncedSupplierSearch
            )}&limit=15`
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

  // --- Fetch Warehouses on Mount ---
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const data = await warehouseService.getAll();
        setWarehouses(data);
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
        toast.error("فشل تحميل المخازن");
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, []);

  // --- Fetch Existing Purchase Data for Edit Mode ---
  useEffect(() => {
    const loadPurchaseData = async (id: number) => {
      setLoadingData(true);
      setServerError(null);
      try {
        const existingPurchase = await purchaseService.getPurchase(id);
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

        const safeInitialProducts = Array.isArray(initialProducts)
          ? initialProducts
          : [];

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
          currency: existingPurchase.currency,
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
  const onSubmit: SubmitHandler<PurchaseFormValues> = useCallback(
    async (data) => {
      setServerError(null);

      // Manual validation
      if (!data.supplier_id || data.supplier_id <= 0) {
        setError("supplier_id", {
          type: "manual",
          message: "يرجى اختيار مورد",
        });
        return;
      }

      if (!data.purchase_date) {
        setError("purchase_date", {
          type: "manual",
          message: "هذا الحقل مطلوب",
        });
        return;
      }

      if (!data.status) {
        setError("status", { type: "manual", message: "هذا الحقل مطلوب" });
        return;
      }

      if (!data.currency) {
        setError("currency", { type: "manual", message: "هذا الحقل مطلوب" });
        return;
      }

      // Validate items for edit mode
      if (isEditMode && (!data.items || data.items.length === 0)) {
        setError("items", {
          type: "manual",
          message: "يجب إضافة عنصر واحد على الأقل",
        });
        return;
      }

      // Validate each item
      let hasItemErrors = false;
      if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
          if (!item.product_id || item.product_id <= 0) {
            setError(`items.${index}.product_id` as any, {
              type: "manual",
              message: "يرجى اختيار منتج",
            });
            hasItemErrors = true;
          }
          if (!item.quantity || item.quantity < 1) {
            setError(`items.${index}.quantity` as any, {
              type: "manual",
              message: "الحد الأدنى للكمية هو 1",
            });
            hasItemErrors = true;
          }
          if (item.batch_number && item.batch_number.length > 100) {
            setError(`items.${index}.batch_number` as any, {
              type: "manual",
              message: "الحد الأقصى 100 حرف",
            });
            hasItemErrors = true;
          }
          if (item.unit_cost < 0) {
            setError(`items.${index}.unit_cost` as any, {
              type: "manual",
              message: "يجب أن يكون أكبر من أو يساوي صفر",
            });
            hasItemErrors = true;
          }
          if (
            item.sale_price !== null &&
            item.sale_price !== undefined &&
            item.sale_price < 0
          ) {
            setError(`items.${index}.sale_price` as any, {
              type: "manual",
              message: "يجب أن يكون أكبر من أو يساوي صفر",
            });
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

      try {
        let createdPurchase: any;
        if (isEditMode && purchaseId) {
          await purchaseService.updatePurchase(
            purchaseId,
            apiData as UpdatePurchaseData
          );
        } else {
          createdPurchase = await purchaseService.createPurchase(
            apiData as CreatePurchaseData
          );
        }

        toast.success("نجح", { description: "تم حفظ المشتريات بنجاح" });

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
                {
                  type: "server",
                  message: messages[0],
                }
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
    },
    [isEditMode, purchaseId, navigate, setError]
  );

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

      const productIds = existingPurchase.items.map((item) => item.product_id);
      let initialProducts: Product[] = [];
      if (productIds.length > 0) {
        try {
          initialProducts = await productService.getProductsByIds(productIds);
        } catch (error) {
          console.error("Failed to fetch products by IDs:", error);
          initialProducts = [];
        }
      }

      const safeInitialProducts = Array.isArray(initialProducts)
        ? initialProducts
        : [];

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
        currency: existingPurchase.currency,
        reference_number: existingPurchase.reference_number || "",
        notes: existingPurchase.notes || "",
        items: existingPurchase.items.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          product: initialProductMap[item.product_id],
          batch_number: item.batch_number || "",
          quantity: Number(item.quantity) || 1,
          unit_cost: Number(item.unit_cost) || 0,
          sale_price: item.sale_price !== null ? Number(item.sale_price) : null,
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

  // Loading skeleton
  if (loadingData && isEditMode) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", p: { xs: 2, md: 4 } }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Skeleton
              variant="rectangular"
              height={100}
              sx={{ borderRadius: 3 }}
            />
            <Skeleton
              variant="rectangular"
              height={400}
              sx={{ borderRadius: 3 }}
            />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        pb: 6,
        pt: { xs: 2, sm: 3 },
      }}
      dir="rtl"
    >
      <Container maxWidth="lg">
        {/* Header Section */}
        <Fade in timeout={300}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              mb: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "stretch", md: "center" },
                justifyContent: "space-between",
                gap: 3,
              }}
            >
              {/* Left Side: Back button and Title */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                <IconButton
                  onClick={() => navigate("/purchases")}
                  sx={{
                    bgcolor: "grey.100",
                    border: "1px solid",
                    borderColor: "grey.200",
                    width: 44,
                    height: 44,
                    "&:hover": {
                      bgcolor: "primary.50",
                      borderColor: "primary.300",
                      color: "primary.main",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ArrowRight size={20} />
                </IconButton>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background: isEditMode
                        ? "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: isEditMode
                        ? "0 4px 12px rgba(139, 92, 246, 0.3)"
                        : "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    {isEditMode ? (
                      <Package size={24} color="white" />
                    ) : (
                      <ShoppingCart size={24} color="white" />
                    )}
                  </Box>
                  <Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: "grey.800",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {isEditMode ? "تعديل المشتريات" : "إضافة مشتريات جديدة"}
                      </Typography>
                      {isEditMode && purchaseId && (
                        <Chip
                          label={`#${purchaseId}`}
                          size="small"
                          sx={{
                            bgcolor: "primary.50",
                            color: "primary.main",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "grey.500", mt: 0.5 }}
                    >
                      {isEditMode
                        ? "تعديل بيانات عملية الشراء"
                        : "إنشاء عملية شراء جديدة للمخزون"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Right Side: Action Buttons */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                {isEditMode && purchaseId && !isPurchaseReceived && (
                  <Button
                    variant="outlined"
                    onClick={() => setIsImportDialogOpen(true)}
                    startIcon={<Upload size={18} />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "grey.300",
                      color: "grey.600",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "primary.50",
                        color: "primary.main",
                      },
                    }}
                  >
                    استيراد
                  </Button>
                )}

                {isEditMode && purchaseId && (
                  <Button
                    variant="outlined"
                    onClick={handleViewPdf}
                    startIcon={<FileText size={18} />}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      borderColor: "grey.300",
                      color: "grey.600",
                      "&:hover": {
                        borderColor: "error.main",
                        bgcolor: "error.50",
                        color: "error.main",
                      },
                    }}
                  >
                    PDF
                  </Button>
                )}

                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting || (loadingData && isEditMode)}
                  onClick={handleSubmit(onSubmit)}
                  startIcon={
                    isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                      boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)",
                    },
                    "&:disabled": {
                      background: "grey.300",
                      boxShadow: "none",
                    },
                  }}
                >
                  {isSubmitting
                    ? "جاري الحفظ..."
                    : isEditMode
                    ? "تحديث"
                    : "إنشاء"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Main Form Card */}
        <Fade in timeout={400}>
          <Card
            sx={{
              bgcolor: "background.paper",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <FormProvider {...formMethods}>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  {/* Server Error Alert */}
                  {serverError && !isSubmitting && (
                    <Fade in>
                      <Alert
                        severity="error"
                        icon={<AlertCircle size={20} />}
                        sx={{
                          mb: 3,
                          borderRadius: 2,
                          bgcolor: "error.50",
                          border: "1px solid",
                          borderColor: "error.200",
                        }}
                      >
                        <AlertTitle sx={{ fontWeight: 700 }}>
                          خطأ في التحقق
                        </AlertTitle>
                        <Typography variant="body2">{serverError}</Typography>
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
                    warehouses={warehouses}
                    loadingWarehouses={loadingWarehouses}
                    isEditMode={isEditMode}
                  />

                  {/* Items Section for Edit Mode */}
                  {isEditMode && (
                    <>
                      <Divider sx={{ my: 4, borderColor: "grey.200" }} />
                      <PurchaseItemsList
                        isSubmitting={isSubmitting}
                        isPurchaseReceived={isPurchaseReceived}
                        warehouses={warehouses}
                      />
                      <Divider sx={{ my: 4, borderColor: "grey.200" }} />

                      {/* Totals Display */}
                      <Paper
                        elevation={0}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 3,
                          p: 3,
                          bgcolor: "primary.50",
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "primary.100",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{ color: "primary.700", fontWeight: 600 }}
                        >
                          الإجمالي الكلي:
                        </Typography>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 1,
                          }}
                        >
                          <Typography
                            variant="h4"
                            sx={{
                              fontWeight: 800,
                              color: "primary.main",
                              letterSpacing: "-0.02em",
                            }}
                          >
                            {formatNumber(grandTotal)}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "primary.400", fontWeight: 500 }}
                          >
                            ر.س
                          </Typography>
                        </Box>
                      </Paper>
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
            toast.success("نجح", { description: "تم استيراد العناصر بنجاح" });
          }}
        />
      )}
    </Box>
  );
};

export default PurchaseFormPage;
