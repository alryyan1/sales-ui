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

// --- Component Props & Types ---
type ProductFormValues = {
  name: string;
  scientific_name: string;
  sku: string;
  image_url: string;
  stocking_unit_id: string;
  sellable_unit_id: string;
  units_per_stocking_unit: number;
  category_id: string;
  stock_alert_level: number | null;
  sale_price: number | string;
  cost_price: number | string;
  expire_date: string;
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
  const [loadingUnits, setLoadingUnits] = useState(true);

  // State for unit creation dialogs
  const [isStockingUnitModalOpen, setIsStockingUnitModalOpen] = useState(false);
  const [isSellableUnitModalOpen, setIsSellableUnitModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

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
      scientific_name: "",
      sku: "",
      image_url: "",
      stocking_unit_id: "",
      sellable_unit_id: "",
      units_per_stocking_unit: 1,
      category_id: "",
      stock_alert_level: 10,
      sale_price: "",
      cost_price: "",
      expire_date: "",
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    setValue,
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
    setLoadingUnits(true);
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
    } finally {
      setLoadingUnits(false);
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
          scientific_name: productToEdit.scientific_name || "",
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
          expire_date: productToEdit.expire_date ?? "",
        });
      } else {
        reset({
          name: "",
          scientific_name: "",
          sku: "",
          image_url: "",
          category_id: "",
          stocking_unit_id: "",
          sellable_unit_id: "",
          units_per_stocking_unit: 1,
          stock_alert_level: 10,
          sale_price: "",
          cost_price: "",
          expire_date: "",
        });
      }
      // Reset tabs when opening
      setActiveTab(0);
      setHistoryTab(0);
      setHistoryData([]);
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
      scientific_name: data.scientific_name || null,
      sku: data.sku || null,
      description: null,
      image_url: data.image_url || null,
      stocking_unit_id: data.stocking_unit_id
        ? Number(data.stocking_unit_id)
        : null,
      sellable_unit_id: data.sellable_unit_id
        ? Number(data.sellable_unit_id)
        : null,
      units_per_stocking_unit: Number(data.units_per_stocking_unit) || 1,
      category_id: data.category_id ? Number(data.category_id) : null,
      stock_quantity: 0, // Always set to 0, stock is managed through purchases
      stock_alert_level: data.stock_alert_level
        ? Number(data.stock_alert_level)
        : null,
      sale_price: data.sale_price !== "" ? Number(data.sale_price) : null,
      cost_price: data.cost_price !== "" ? Number(data.cost_price) : null,
      expire_date: data.expire_date || null,
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
    >
      {/* <DialogTitle
        sx={{
          pb: 1.5,
          pt: 3,
          px: 3,
          borderBottom: 1,
          borderColor: "divider",
        }}
      > */}
      {/* <Typography variant="h6" component="div" fontWeight={600}>
          {isEditMode ? "تعديل منتج" : "إضافة منتج جديد"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {isEditMode
            ? "قم بتحديث بيانات المنتج الحالية وحفظ التغييرات"
            : "أدخل بيانات المنتج بدقة لتسهيل إدارة المخزون والمبيعات"}
        </Typography> */}
      {/* </DialogTitle> */}
      <DialogContent
        sx={{
          pt: 1,
          px: 1,
          pb: 1,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {isEditMode && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
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

        {/* Product Details Tab (Always visible in create mode, or active in edit mode) */}
        {(!isEditMode || activeTab === 0) && (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* General Server Error Alert */}
            {serverError && !isSubmitting && (
              <Alert
                severity="error"
                sx={{
                  mb: 3,
                  borderRadius: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle sx={{ fontWeight: 600 }}>خطأ</AlertTitle>
                </Box>
                {serverError}
              </Alert>
            )}

            {/* --- Basic Product Information Section --- */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ mb: 2.5, color: "text.primary" }}
              >
                معلومات المنتج الأساسية
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2.5,
                }}
              >
                {/* Name Field */}
                <Controller
                  control={control}
                  name="name"
                  rules={{
                    required: "اسم المنتج مطلوب",
                    minLength: {
                      value: 2,
                      message: "اسم المنتج يجب أن يكون على الأقل حرفين",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="اسم المنتج"
                      placeholder="اكتب اسم المنتج"
                      fullWidth
                      size="small"
                      disabled={isSubmitting}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      onChange={(e) => {
                        field.onChange(e);
                        // Real-time copy to scientific_name
                        setValue("scientific_name", e.target.value, {
                          shouldValidate: true,
                          shouldDirty: true,
                        });
                      }}
                    />
                  )}
                />

                {/* Scientific Name Field */}
                <Controller
                  control={control}
                  name="scientific_name"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="الاسم العلمي"
                      placeholder="(اختياري) الاسم العلمي للمنتج"
                      fullWidth
                      size="small"
                      disabled={isSubmitting}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                    />
                  )}
                />

                {/* SKU Field (locked when editing) */}
                <Controller
                  control={control}
                  name="sku"
                  render={({ field, fieldState }) => (
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label="الرمز (SKU)"
                        placeholder="(اختياري) رمز المنتج في النظام"
                        fullWidth
                        size="small"
                        disabled={isSubmitting} // Enabled editing in edit mode
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                          }
                        }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => {
                          const randomSKU = generateRandomSKU("PROD", 6);
                          field.onChange(randomSKU);
                        }}
                        disabled={isSubmitting} // Enabled generating new SKU in edit mode
                        sx={{ minWidth: 0, px: 1.5 }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </Box>
                  )}
                />

                {/* Image URL Field */}
                <Controller
                  control={control}
                  name="image_url"
                  render={({ field, fieldState }) => (
                    <Box>
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label="رابط الصورة (URL)"
                        placeholder="(اختياري) رابط صورة المنتج أو ارفع ملف"
                        fullWidth
                        size="small"
                        disabled={isSubmitting || uploadingImage}
                        error={!!fieldState.error}
                        helperText={
                          fieldState.error?.message ||
                          "يمكنك إدخال رابط URL أو رفع ملف صورة"
                        }
                        InputProps={{
                          endAdornment: (
                            <Box sx={{ display: "flex", gap: 0.5 }}>
                              <input
                                accept="image/*"
                                style={{ display: "none" }}
                                id={`image-upload-${productToEdit?.id || "new"}`}
                                type="file"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;

                                  if (file.size > 2 * 1024 * 1024) {
                                    toast.error("حجم الملف كبير جداً", {
                                      description:
                                        "الحد الأقصى لحجم الصورة هو 2MB",
                                    });
                                    return;
                                  }

                                  setUploadingImage(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append("image", file);

                                    let productId = productToEdit?.id;
                                    if (!productId) {
                                      toast.error(
                                        "يرجى حفظ المنتج أولاً ثم رفع الصورة",
                                      );
                                      setUploadingImage(false);
                                      return;
                                    }

                                    const response = await apiClient.post(
                                      `/products/${productId}/image`,
                                      formData,
                                      {
                                        headers: {
                                          "Content-Type": "multipart/form-data",
                                        },
                                      },
                                    );

                                    if (response.data?.product?.image_url) {
                                      field.onChange(
                                        response.data.product.image_url,
                                      );
                                      toast.success("تم رفع الصورة بنجاح");
                                    }
                                  } catch (error: any) {
                                    console.error(
                                      "Error uploading image:",
                                      error,
                                    );
                                    toast.error("فشل رفع الصورة", {
                                      description:
                                        error?.response?.data?.message ||
                                        "حدث خطأ غير متوقع",
                                    });
                                  } finally {
                                    setUploadingImage(false);
                                  }
                                }}
                              />
                              <label
                                htmlFor={`image-upload-${
                                  productToEdit?.id || "new"
                                }`}
                              >
                                <Button
                                  component="span"
                                  variant="outlined"
                                  size="small"
                                  disabled={
                                    isSubmitting ||
                                    uploadingImage ||
                                    !productToEdit
                                  }
                                  startIcon={
                                    uploadingImage ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Upload className="h-4 w-4" />
                                    )
                                  }
                                  sx={{ minWidth: "auto", px: 1.5 }}
                                >
                                  {uploadingImage ? "جاري الرفع..." : "رفع"}
                                </Button>
                              </label>
                              {field.value && (
                                <IconButton
                                  size="small"
                                  onClick={() => field.onChange("")}
                                  disabled={isSubmitting}
                                  sx={{ ml: 0.5 }}
                                >
                                  <X className="h-4 w-4" />
                                </IconButton>
                              )}
                            </Box>
                          ),
                        }}
                      />
                      {field.value && (
                        <Box
                          sx={{
                            mt: 2,
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <ProductImage
                            imageUrl={field.value}
                            productName={form.watch("name") || "Product"}
                            size={120}
                            variant="rounded"
                          />
                        </Box>
                      )}
                    </Box>
                  )}
                />

                {/* Category Autocomplete */}
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field, fieldState }) => (
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={categories}
                        loading={loadingCategories}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        value={
                          categories.find(
                            (cat) => String(cat.id) === field.value,
                          ) || null
                        }
                        onChange={(_, newValue) =>
                          field.onChange(newValue ? String(newValue.id) : "")
                        }
                        disabled={isSubmitting || loadingCategories}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="الفئة"
                            placeholder={
                              loadingCategories
                                ? "جاري تحميل الفئات..."
                                : "اختر الفئة"
                            }
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                        noOptionsText={
                          loadingCategories
                            ? "جاري تحميل الفئات..."
                            : "لا توجد فئات متاحة"
                        }
                      />
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setIsCategoryModalOpen(true)}
                        disabled={isSubmitting}
                        sx={{ minWidth: 40, height: 40 }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Box>
                  )}
                />
              </Box>
            </Paper>

            {/* --- Units & Inventory Section --- */}
            <Paper
              elevation={0}
              sx={{
                p: 3,
                mb: 3,
                bgcolor: "background.paper",
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ mb: 2.5, color: "text.primary" }}
              >
                الوحدات والمخزون
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2.5,
                  mb: 2,
                }}
              >
                {/* Stocking Unit Autocomplete */}
                <Controller
                  control={control}
                  name="stocking_unit_id"
                  render={({ field, fieldState }) => (
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={stockingUnits}
                        loading={loadingUnits}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        value={
                          stockingUnits.find(
                            (unit) => String(unit.id) === field.value,
                          ) || null
                        }
                        onChange={(_, newValue) =>
                          field.onChange(newValue ? String(newValue.id) : "")
                        }
                        disabled={isSubmitting || loadingUnits}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="وحدة التخزين"
                            placeholder={
                              loadingUnits
                                ? "جاري تحميل الوحدات..."
                                : "اختر وحدة التخزين"
                            }
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                        noOptionsText={
                          loadingUnits
                            ? "جاري تحميل الوحدات..."
                            : "لا توجد وحدات تخزين متاحة"
                        }
                      />
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setIsStockingUnitModalOpen(true)}
                        disabled={isSubmitting}
                        sx={{ minWidth: 40, height: 40 }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Box>
                  )}
                />

                {/* Sellable Unit Autocomplete */}
                <Controller
                  control={control}
                  name="sellable_unit_id"
                  render={({ field, fieldState }) => (
                    <Box
                      sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}
                    >
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={sellableUnits}
                        loading={loadingUnits}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) =>
                          option.id === value.id
                        }
                        value={
                          sellableUnits.find(
                            (unit) => String(unit.id) === field.value,
                          ) || null
                        }
                        onChange={(_, newValue) =>
                          field.onChange(newValue ? String(newValue.id) : "")
                        }
                        disabled={isSubmitting || loadingUnits}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="وحدة البيع"
                            placeholder={
                              loadingUnits
                                ? "جاري تحميل الوحدات..."
                                : "اختر وحدة البيع"
                            }
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                          />
                        )}
                        noOptionsText={
                          loadingUnits
                            ? "جاري تحميل الوحدات..."
                            : "لا توجد وحدات بيع متاحة"
                        }
                      />
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setIsSellableUnitModalOpen(true)}
                        disabled={isSubmitting}
                        sx={{ minWidth: 40, height: 40 }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </Box>
                  )}
                />
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr", mt: 2 },
                  gap: 2.5,
                }}
              >
                {/* Units Per Stocking Unit */}
                <Controller
                  control={control}
                  name="units_per_stocking_unit"
                  rules={{
                    required: "عدد الوحدات لكل وحدة تخزين مطلوب",
                    min: {
                      value: 1,
                      message: "يجب أن يكون العدد 1 على الأقل",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="عدد الوحدات في وحدة التخزين"
                      type="number"
                      fullWidth
                      size="small"
                      inputProps={{ min: 1, step: 1 }}
                      disabled={isSubmitting}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      helperText={
                        fieldState.error?.message ||
                        "عدد الوحدات البيعية داخل وحدة التخزين (مثال: 12 حبة في كرتونة)"
                      }
                      error={!!fieldState.error}
                    />
                  )}
                />

                {/* Stock Alert Level Field */}
                <Controller
                  control={control}
                  name="stock_alert_level"
                  rules={{
                    min: {
                      value: 0,
                      message: "لا يمكن أن يكون حد التنبيه أقل من 0",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="حد تنبيه انخفاض المخزون"
                      type="number"
                      fullWidth
                      size="small"
                      inputProps={{ min: 0, step: 1 }}
                      disabled={isSubmitting}
                      onFocus={(e) => e.target.select()}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      helperText={
                        fieldState.error?.message ||
                        "عند الوصول لهذه الكمية سيتم إظهار تنبيه بانخفاض المخزون (اختياري)"
                      }
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Box>

              <Typography
                variant="subtitle1"
                fontWeight={600}
                sx={{ mb: 2.5, mt: 3, color: "text.primary" }}
              >
                تحديث الأسعار وتاريخ الصلاحية (اختياري)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                عند تعبئة هذه الحقول، ستلغي الأسعار والصلاحية المحسوبة من
                المشتريات وتُعتمد هذه القيم.
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
                  gap: 2.5,
                }}
              >
                {/* Cost Price */}
                <Controller
                  control={control}
                  name="cost_price"
                  rules={{
                    min: {
                      value: 0,
                      message: "السعر يجب أن يكون 0 أو أكثر",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="سعر التكلفة (اختياري)"
                      type="number"
                      fullWidth
                      size="small"
                      inputProps={{ min: 0, step: "0.01" }}
                      disabled={isSubmitting}
                      onFocus={(e) => e.target.select()}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      helperText={fieldState.error?.message}
                      error={!!fieldState.error}
                    />
                  )}
                />

                {/* Sale Price */}
                <Controller
                  control={control}
                  name="sale_price"
                  rules={{
                    min: {
                      value: 0,
                      message: "السعر يجب أن يكون 0 أو أكثر",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="سعر البيع (اختياري)"
                      type="number"
                      fullWidth
                      size="small"
                      inputProps={{ min: 0, step: "0.01" }}
                      disabled={isSubmitting}
                      onFocus={(e) => e.target.select()}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      helperText={fieldState.error?.message}
                      error={!!fieldState.error}
                    />
                  )}
                />

                {/* Expire Date */}
                <Controller
                  control={control}
                  name="expire_date"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="تاريخ الصلاحية (اختياري)"
                      type="date"
                      fullWidth
                      size="small"
                      disabled={isSubmitting}
                      InputLabelProps={{ shrink: true }}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      helperText={fieldState.error?.message}
                      error={!!fieldState.error}
                    />
                  )}
                />
              </Box>
            </Paper>

            <DialogActions
              sx={{
                mt: 1,
                px: 1,
                pb: 1,
                pt: 1,
                borderTop: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                الحقول المميزة بـ <span style={{ color: "red" }}>*</span>{" "}
                إلزامية
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {isEditMode && (
                  <Button
                    type="button"
                    onClick={handleDelete}
                    color="error"
                    variant="outlined"
                    disabled={isSubmitting}
                    sx={{ minWidth: 100 }}
                    startIcon={<Trash2 className="h-4 w-4" />}
                  >
                    حذف
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleClose}
                  color="inherit"
                  variant="outlined"
                  disabled={isSubmitting}
                  sx={{ minWidth: 100 }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ minWidth: 100 }}
                  startIcon={
                    isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : undefined
                  }
                >
                  {isEditMode ? "تحديث" : "حفظ"}
                </Button>
              </Box>
            </DialogActions>
          </Box>
        )}

        {/* Product History Tab */}
        {isEditMode && activeTab === 1 && (
          <Box className="animate-in fade-in zoom-in duration-300">
            <Tabs
              value={historyTab}
              onChange={handleHistoryTypeChange}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab label="المشتروات" />
              <Tab label="المبيعات" />
            </Tabs>

            <Paper
              elevation={0}
              sx={{
                p: 0,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">التاريخ</TableCell>
                      <TableCell align="center">
                        {historyTab === 0 ? "المورد" : "العميل"}
                      </TableCell>
                      <TableCell align="center">
                        {historyTab === 0
                          ? "الكمية (وحدة تخزين)"
                          : "الكمية (وحدة بيع)"}
                      </TableCell>
                      <TableCell align="center">
                        {historyTab === 0 ? "التكلفة" : "السعر"}
                      </TableCell>
                      <TableCell align="center">الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            جاري التحميل...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : historyData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            لا توجد سجلات
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyData.map((item: any) => (
                        <TableRow key={item.id} hover>
                          <TableCell align="center">
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString(
                                  "en-GB",
                                )
                              : "---"}
                          </TableCell>
                          <TableCell align="center">
                            {historyTab === 0
                              ? item.purchase?.supplier?.name || "N/A"
                              : item.sale?.client?.name || "N/A"}
                          </TableCell>
                          <TableCell align="center">
                            {formatNumber(item.quantity)}
                          </TableCell>
                          <TableCell align="center">
                            {formatCurrency(
                              historyTab === 0
                                ? item.unit_cost
                                : item.unit_price,
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {formatCurrency(
                              historyTab === 0
                                ? item.total_cost
                                : item.total_price,
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box
                sx={{
                  p: 2,
                  borderTop: 1,
                  borderColor: "divider",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <Button onClick={onClose} variant="outlined">
                  إغلاق
                </Button>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      {/* Category Creation Modal */}
      <CategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={null}
        onSaveSuccess={handleCategoryCreated}
        allCategories={categories}
        loadingCategories={loadingCategories}
      />

      {/* Stocking Unit Creation Modal */}
      <UnitFormModal
        isOpen={isStockingUnitModalOpen}
        onClose={() => setIsStockingUnitModalOpen(false)}
        unitToEdit={null}
        onSaveSuccess={handleStockingUnitCreated}
        defaultType="stocking"
      />

      {/* Sellable Unit Creation Modal */}
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
