// src/components/products/ProductFormModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

// MUI components
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  AlertTitle,
  Typography,
  Autocomplete,
  Paper,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  Upload,
  X,
  Image as ImageIcon,
  Trash2,
  Info,
  Package,
  DollarSign,
} from "lucide-react";

// Services and Types
import productService, {
  Product,
  ProductFormData,
} from "../../services/productService";
import categoryService, { Category } from "@/services/CategoryService";
import unitService, { Unit } from "@/services/UnitService";
import { generateRandomSKU } from "@/lib/utils";
import CategoryFormModal from "@/components/admin/users/categories/CategoryFormModal";
import UnitFormModal from "@/components/admin/users/units/UnitFormModal";
import { ProductImage } from "./ProductImage";

import apiClient from "@/lib/axios";
import { formatNumber, formatCurrency } from "@/constants";
import theme from "@/theme";

// --- Component Props & Types ---
type ProductFormValues = {
  name: string;
  sku: string;
  image_url: string;
  stocking_unit_id: string;
  sellable_unit_id: string;
  units_per_stocking_unit: number;
  category_id: string;
  stock_alert_level: number | null;
  sale_price: number | string;
  cost_price: number | string;
  description: string;
};

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSaveSuccess: (product: Product) => void;
  onDeleteSuccess?: () => void;
}

// --- Component Definition ---
const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaveSuccess,
  onDeleteSuccess,
}) => {
  const isEditMode = Boolean(productToEdit);

  // State for categories dropdown and general API errors
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // State for category creation dialog
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // State for units dropdown
  const [stockingUnits, setStockingUnits] = useState<Unit[]>([]);
  const [sellableUnits, setSellableUnits] = useState<Unit[]>([]);

  // State for unit creation dialogs
  const [isStockingUnitModalOpen, setIsStockingUnitModalOpen] = useState(false);
  const [isSellableUnitModalOpen, setIsSellableUnitModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  // --- History Tab State ---
  const [activeTab, setActiveTab] = useState(0);
  const [historyTab, setHistoryTab] = useState(0);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // --- React Hook Form Setup ---
  const form = useForm<ProductFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      sku: "",
      image_url: "",
      stocking_unit_id: "",
      sellable_unit_id: "",
      units_per_stocking_unit: 1,
      category_id: "",
      stock_alert_level: 10,
      sale_price: "",
      cost_price: "",
      description: "",
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
    setError,
  } = form;

  // --- Fetch Categories for Dropdown ---
  const fetchCategoriesForSelect = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryService.getCategories(
        1,
        9999,
        "",
        false,
        true,
      );
      setCategories(data as Category[]);
    } catch (error) {
      console.error("Error fetching categories for product form:", error);
      toast.error("خطأ", {
        description: categoryService.getErrorMessage(error, "فشل تحميل الفئات"),
      });
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // --- Fetch Units for Dropdown ---
  const fetchUnitsForSelect = useCallback(async () => {
    try {
      const [stockingData, sellableData] = await Promise.all([
        unitService.getStockingUnits(),
        unitService.getSellableUnits(),
      ]);
      setStockingUnits(stockingData);
      setSellableUnits(sellableData);
    } catch (error) {
      console.error("Error fetching units for product form:", error);
      toast.error("خطأ", {
        description: unitService.getErrorMessage(error, "فشل تحميل الوحدات"),
      });
    }
  }, []);

  // --- Handle Category Creation Success ---
  const handleCategoryCreated = useCallback(
    (newCategory: Category) => {
      setCategories((prev) => [...prev, newCategory]);
      form.setValue("category_id", String(newCategory.id));
      setIsCategoryModalOpen(false);
    },
    [form],
  );

  // --- Handle Unit Creation Success ---
  const handleStockingUnitCreated = useCallback(
    (newUnit: Unit) => {
      setStockingUnits((prev) => [...prev, newUnit]);
      form.setValue("stocking_unit_id", String(newUnit.id));
      setIsStockingUnitModalOpen(false);
    },
    [form],
  );

  const handleSellableUnitCreated = useCallback(
    (newUnit: Unit) => {
      setSellableUnits((prev) => [...prev, newUnit]);
      form.setValue("sellable_unit_id", String(newUnit.id));
      setIsSellableUnitModalOpen(false);
    },
    [form],
  );

  // --- Fetch Product History ---
  const fetchHistory = useCallback(
    async (productId: number, type: "purchases" | "sales", page: number) => {
      setHistoryLoading(true);
      try {
        const res =
          type === "purchases"
            ? await productService.getPurchaseHistory(productId, page)
            : await productService.getSalesHistory(productId, page);
        setHistoryData(res.data);
      } catch (err) {
        console.error(err);
        toast.error("فشل تحميل السجل");
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  // Load history when tab becomes active
  useEffect(() => {
    if (isEditMode && productToEdit && activeTab === 1) {
      fetchHistory(
        productToEdit.id,
        historyTab === 0 ? "purchases" : "sales",
        1,
      );
    }
  }, [activeTab, historyTab, isEditMode, productToEdit, fetchHistory]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleHistoryTypeChange = (
    _event: React.SyntheticEvent,
    newValue: number,
  ) => {
    setHistoryTab(newValue);
  };

  // --- Effect to Populate/Reset Form and Fetch Categories ---
  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      fetchCategoriesForSelect();
      fetchUnitsForSelect();

      if (isEditMode && productToEdit) {
        reset({
          name: productToEdit.name || "",
          sku: productToEdit.sku || "",
          image_url: productToEdit.image_url || "",
          stocking_unit_id: productToEdit.stocking_unit_id
            ? String(productToEdit.stocking_unit_id)
            : "",
          sellable_unit_id: productToEdit.sellable_unit_id
            ? String(productToEdit.sellable_unit_id)
            : "",
          units_per_stocking_unit: productToEdit.units_per_stocking_unit || 1,
          category_id: productToEdit.category_id
            ? String(productToEdit.category_id)
            : "",
          stock_alert_level: productToEdit.stock_alert_level ?? 10,
          sale_price: productToEdit.sale_price ?? "",
          cost_price: productToEdit.cost_price ?? "",
          description: productToEdit.description || "",
        });
      } else {
        reset({
          name: "",
          sku: "",
          image_url: "",
          category_id: "",
          stocking_unit_id: "",
          sellable_unit_id: "",
          units_per_stocking_unit: 1,
          stock_alert_level: 10,
          sale_price: "",
          cost_price: "",
          description: "",
        });
      }
      // Reset tabs when opening
      setActiveTab(0);
      setHistoryTab(0);
      setHistoryData([]);
      setSelectedImageFile(null);
      setImagePreviewUrl(null);
    }
  }, [
    isOpen,
    isEditMode,
    productToEdit,
    reset,
    fetchCategoriesForSelect,
    fetchUnitsForSelect,
  ]);

  // --- Form Submission Handler ---
  const onSubmit = async (data: ProductFormValues) => {
    setServerError(null);
    console.log("Submitting product data:", data);

    const dataToSend: ProductFormData = {
      name: data.name,
      scientific_name: null,
      sku: data.sku || null,
      description: data.description || null,
      image_url: data.image_url || null,
      stocking_unit_id: data.stocking_unit_id
        ? Number(data.stocking_unit_id)
        : null,
      sellable_unit_id: data.sellable_unit_id
        ? Number(data.sellable_unit_id)
        : null,
      units_per_stocking_unit: Number(data.units_per_stocking_unit) || 1,
      category_id: data.category_id ? Number(data.category_id) : null,
      stock_quantity: 0,
      stock_alert_level: data.stock_alert_level
        ? Number(data.stock_alert_level)
        : null,
      sale_price: data.sale_price !== "" ? Number(data.sale_price) : null,
      cost_price: data.cost_price !== "" ? Number(data.cost_price) : null,
      expire_date: null,
    };

    try {
      let savedProduct: Product;
      if (isEditMode && productToEdit) {
        savedProduct = await productService.updateProduct(
          productToEdit.id,
          dataToSend,
        );
      } else {
        savedProduct = await productService.createProduct(dataToSend);

        // Handle image upload for NEW products after creation
        if (selectedImageFile) {
          setUploadingImage(true);
          try {
            const formData = new FormData();
            formData.append("image", selectedImageFile);

            const uploadResponse = await apiClient.post(
              `/products/${savedProduct.id}/image`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
              },
            );

            if (uploadResponse.data?.product) {
              savedProduct = uploadResponse.data.product;
            }
          } catch (uploadErr) {
            console.error("Delayed image upload failed:", uploadErr);
            toast.error("فشل رفع الصورة", {
              description: "تم حفظ المنتج ولكن فشل رفع الصورة المحددة.",
            });
          } finally {
            setUploadingImage(false);
          }
        }
      }
      console.log("Save successful:", savedProduct);

      toast.success(
        isEditMode ? "تم تحديث المنتج بنجاح" : "تم إنشاء المنتج بنجاح",
        { duration: 3000 },
      );

      onSaveSuccess(savedProduct);
      onClose();
    } catch (err) {
      console.error("Failed to save product:", err);
      const generalError = productService.getErrorMessage(err);
      const apiErrors = productService.getValidationErrors(err);

      toast.error("خطأ", {
        description: generalError,
        duration: 5000,
      });
      setServerError(generalError);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof typeof data, {
            type: "server",
            message: Array.isArray(messages) ? messages[0] : String(messages),
          });
        });
        setServerError("يرجى التحقق من الحقول المدخلة.");
      }
    }
  };

  // --- Render Modal ---
  if (!isOpen) return null;

  // --- Delete Handler ---
  const handleDelete = async () => {
    if (!productToEdit) return;

    if (
      !window.confirm(
        "هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.",
      )
    ) {
      return;
    }

    try {
      await productService.deleteProduct(productToEdit.id);
      toast.success("تم حذف المنتج بنجاح");
      if (onDeleteSuccess) onDeleteSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("فشل حذف المنتج", {
        description: productService.getErrorMessage(error),
      });
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      dir="rtl"
      PaperProps={{
        sx: {
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background:
            theme.palette.mode === "dark"
              ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.paper} 100%)`
              : `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
          p: 2.5,
          color: theme.palette.mode === "dark" ? "text.primary" : "white",
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 0.5,
        }}
      >
        <Typography variant="h6" fontWeight={700}>
          {isEditMode ? "تعديل منتج" : "إضافة منتج جديد"}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.85 }}>
          {isEditMode
            ? "تحديث بيانات المنتج الحالية"
            : "أدخل بيانات المنتج بدقة"}
        </Typography>
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            left: 16,
            top: 20,
            color: "inherit",
            bgcolor: "rgba(255,255,255,0.15)",
            "&:hover": { bgcolor: "rgba(255,255,255,0.25)" },
          }}
        >
          <X className="h-5 w-5" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, bgcolor: "background.default" }}>
        {isEditMode && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2.5 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="تفاصيل المنتج" />
              <Tab label="سجل الحركات" />
            </Tabs>
          </Box>
        )}

        {(!isEditMode || activeTab === 0) && (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {serverError && !isSubmitting && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle sx={{ fontWeight: 600 }}>خطأ</AlertTitle>
                </Box>
                {serverError}
              </Alert>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 3,
              }}
            >
              {/* Left Column: Basic Info, Units, Price */}
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                {/* Basic Info Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 2.5,
                    }}
                  >
                    <Info className="h-5 w-5 text-primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      المعلومات الأساسية
                    </Typography>
                  </Box>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    <Box>
                      <Controller
                        control={control}
                        name="name"
                        rules={{ required: "اسم المنتج مطلوب" }}
                        render={({ field, fieldState }) => (
                          <TextField
                            {...field}
                            label="اسم المنتج *"
                            fullWidth
                            size="small"
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                      />
                    </Box>
                    <Box>
                      <Controller
                        control={control}
                        name="sku"
                        render={({ field, fieldState }) => (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <TextField
                              {...field}
                              label="الرمز (SKU)"
                              fullWidth
                              size="small"
                              error={!!fieldState.error}
                              helperText={fieldState.error?.message}
                            />
                            <Button
                              variant="outlined"
                              onClick={() =>
                                field.onChange(generateRandomSKU("PROD", 6))
                              }
                              sx={{ minWidth: 40 }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </Box>
                        )}
                      />
                    </Box>
                    <Box>
                      <Controller
                        control={control}
                        name="category_id"
                        render={({ field, fieldState }) => (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={categories}
                              loading={loadingCategories}
                              getOptionLabel={(option) => option.name || ""}
                              value={
                                categories.find(
                                  (c) => String(c.id) === field.value,
                                ) || null
                              }
                              onChange={(_, v) =>
                                field.onChange(v ? String(v.id) : "")
                              }
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="الفئة"
                                  error={!!fieldState.error}
                                />
                              )}
                            />
                            <Button
                              variant="outlined"
                              onClick={() => setIsCategoryModalOpen(true)}
                              sx={{ minWidth: 40 }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </Box>
                        )}
                      />
                    </Box>
                    <Box>
                      <Controller
                        control={control}
                        name="description"
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="وصف المنتج"
                            fullWidth
                            size="small"
                            multiline
                            rows={3}
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Paper>

                {/* Units & Inventory Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 2.5,
                    }}
                  >
                    <Package className="h-5 w-5 text-primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      الوحدات والمخزون
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                    <Box
                      sx={{
                        flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 16px)" },
                      }}
                    >
                      <Controller
                        control={control}
                        name="stocking_unit_id"
                        rules={{ required: "مطلوب" }}
                        render={({ field, fieldState }) => (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={stockingUnits}
                              getOptionLabel={(o) => o.name}
                              value={
                                stockingUnits.find(
                                  (u) => String(u.id) === field.value,
                                ) || null
                              }
                              onChange={(_, v) =>
                                field.onChange(v ? String(v.id) : "")
                              }
                              renderInput={(p) => (
                                <TextField
                                  {...p}
                                  label="وحدة التخزين *"
                                  error={!!fieldState.error}
                                />
                              )}
                            />
                            <Button
                              variant="outlined"
                              onClick={() => setIsStockingUnitModalOpen(true)}
                              sx={{ minWidth: 40 }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </Box>
                        )}
                      />
                    </Box>
                    <Box
                      sx={{
                        flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 16px)" },
                      }}
                    >
                      <Controller
                        control={control}
                        name="sellable_unit_id"
                        rules={{ required: "مطلوب" }}
                        render={({ field, fieldState }) => (
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Autocomplete
                              fullWidth
                              size="small"
                              options={sellableUnits}
                              getOptionLabel={(o) => o.name}
                              value={
                                sellableUnits.find(
                                  (u) => String(u.id) === field.value,
                                ) || null
                              }
                              onChange={(_, v) =>
                                field.onChange(v ? String(v.id) : "")
                              }
                              renderInput={(p) => (
                                <TextField
                                  {...p}
                                  label="وحدة البيع *"
                                  error={!!fieldState.error}
                                />
                              )}
                            />
                            <Button
                              variant="outlined"
                              onClick={() => setIsSellableUnitModalOpen(true)}
                              sx={{ minWidth: 40 }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </Box>
                        )}
                      />
                    </Box>
                    <Box
                      sx={{
                        flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 16px)" },
                      }}
                    >
                      <Controller
                        control={control}
                        name="units_per_stocking_unit"
                        render={({ field }) => (
                          <TextField
                            {...field}
                            label="الوحدات الكل تخزين"
                            type="number"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                    </Box>
                    <Box
                      sx={{
                        flex: { xs: "1 1 100%", sm: "1 1 calc(50% - 16px)" },
                      }}
                    >
                      <Controller
                        control={control}
                        name="stock_alert_level"
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value ?? ""}
                            label="حد التنبيه"
                            type="number"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Paper>

                {/* Pricing Card */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 2.5,
                    }}
                  >
                    <DollarSign className="h-5 w-5 text-primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      الأسعار والتكاليف
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Controller
                        control={control}
                        name="cost_price"
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value ?? ""}
                            label="سعر التكلفة (USD)"
                            type="number"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Controller
                        control={control}
                        name="sale_price"
                        render={({ field }) => (
                          <TextField
                            {...field}
                            value={field.value ?? ""}
                            label="سعر البيع (SDG)"
                            type="number"
                            fullWidth
                            size="small"
                          />
                        )}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Box>

              {/* Right Column: Image */}
              <Box sx={{ width: { xs: "100%", md: "380px" } }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    textAlign: "center",
                    position: "sticky",
                    top: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      mb: 2.5,
                      justifyContent: "center",
                    }}
                  >
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      صورة المنتج
                    </Typography>
                  </Box>

                  <Controller
                    control={control}
                    name="image_url"
                    render={({ field }) => (
                      <Box>
                        <Box
                          sx={{
                            mb: 2,
                            p: 2,
                            border: "2px dashed",
                            borderColor: "divider",
                            borderRadius: 3,
                            bgcolor: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <ProductImage
                            imageUrl={imagePreviewUrl || field.value}
                            productName={form.watch("name") || "Product"}
                            size={180}
                            variant="rounded"
                          />
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            flexDirection: "column",
                          }}
                        >
                          <TextField
                            {...field}
                            value={field.value ?? ""}
                            label="رابط الصورة (URL)"
                            fullWidth
                            size="small"
                          />
                          <Typography variant="caption" color="text.secondary">
                            أو ارفع ملف مباشرة
                          </Typography>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <input
                              accept="image/*"
                              style={{ display: "none" }}
                              id="image-upload-main"
                              type="file"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (isEditMode && productToEdit) {
                                  setUploadingImage(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append("image", file);
                                    const res = await apiClient.post(
                                      `/products/${productToEdit.id}/image`,
                                      formData,
                                      {
                                        headers: {
                                          "Content-Type": "multipart/form-data",
                                        },
                                      },
                                    );
                                    if (res.data?.product?.image_url)
                                      field.onChange(
                                        res.data.product.image_url,
                                      );
                                    toast.success("تم الرفع");
                                  } catch {
                                    toast.error("فشل الرفع");
                                  } finally {
                                    setUploadingImage(false);
                                  }
                                } else {
                                  setSelectedImageFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () =>
                                    setImagePreviewUrl(reader.result as string);
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                            <label
                              htmlFor="image-upload-main"
                              style={{ width: "100%" }}
                            >
                              <Button
                                fullWidth
                                variant="contained"
                                component="span"
                                disabled={uploadingImage}
                                startIcon={
                                  uploadingImage ? (
                                    <Loader2 className="animate-spin" />
                                  ) : (
                                    <Upload />
                                  )
                                }
                              >
                                {uploadingImage ? "جاري الرفع..." : "رفع صورة"}
                              </Button>
                            </label>
                            {(field.value || imagePreviewUrl) && (
                              <IconButton
                                color="error"
                                onClick={() => {
                                  field.onChange("");
                                  setImagePreviewUrl(null);
                                }}
                              >
                                <X className="h-5 w-5" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    )}
                  />
                </Paper>
              </Box>
            </Box>

            <DialogActions
              sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: "divider" }}
            >
              <Box sx={{ mr: "auto" }}>
                {isEditMode && (
                  <Button
                    color="error"
                    variant="text"
                    onClick={handleDelete}
                    startIcon={<Trash2 />}
                  >
                    حذف المنتج
                  </Button>
                )}
              </Box>
              <Button onClick={handleClose} color="inherit">
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting && <Loader2 className="animate-spin" />}
              >
                {isEditMode ? "حفظ التغييرات" : "إنشاء المنتج"}
              </Button>
            </DialogActions>
          </Box>
        )}

        {isEditMode && activeTab === 1 && (
          <Box>
            <Tabs
              value={historyTab}
              onChange={handleHistoryTypeChange}
              variant="fullWidth"
              sx={{ mb: 2 }}
            >
              <Tab label="المشتروات" />
              <Tab label="المبيعات" />
            </Tabs>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ maxHeight: 400, borderRadius: 2 }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">التاريخ</TableCell>
                    <TableCell align="center">
                      {historyTab === 0 ? "المورد" : "العميل"}
                    </TableCell>
                    <TableCell align="center">الكمية</TableCell>
                    <TableCell align="center">
                      {historyTab === 0 ? "التكلفة" : "السعر"}
                    </TableCell>
                    <TableCell align="center">الإجمالي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : historyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          لا توجد سجلات
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyData.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell align="center">
                          {new Date(item.created_at).toLocaleDateString(
                            "en-GB",
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {historyTab === 0
                            ? item.purchase?.supplier?.name
                            : item.sale?.client?.name}
                        </TableCell>
                        <TableCell align="center">
                          {formatNumber(item.quantity)}
                        </TableCell>
                        <TableCell align="center">
                          {formatCurrency(
                            historyTab === 0 ? item.unit_cost : item.unit_price,
                            undefined,
                            historyTab === 0 ? "USD" : "SDG"
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {formatCurrency(
                            historyTab === 0
                              ? item.total_cost
                              : item.total_price,
                            undefined,
                            historyTab === 0 ? "USD" : "SDG"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={null}
        onSaveSuccess={handleCategoryCreated}
        allCategories={categories}
        loadingCategories={loadingCategories}
      />
      <UnitFormModal
        isOpen={isStockingUnitModalOpen}
        onClose={() => setIsStockingUnitModalOpen(false)}
        unitToEdit={null}
        onSaveSuccess={handleStockingUnitCreated}
        defaultType="stocking"
      />
      <UnitFormModal
        isOpen={isSellableUnitModalOpen}
        onClose={() => setIsSellableUnitModalOpen(false)}
        unitToEdit={null}
        onSaveSuccess={handleSellableUnitCreated}
        defaultType="sellable"
      />
    </Dialog>
  );
};

export default ProductFormModal;
