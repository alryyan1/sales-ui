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
  Chip,
  Divider,
  alpha,
  Tooltip,
} from "@mui/material";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Plus,
  X,
  Trash2,
  Package,
  Tag,
  Layers,
  DollarSign,
  History,
  ShoppingCart,
  TrendingUp,
  Save,
  Edit3,
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

import { formatNumber, formatCurrency } from "@/constants";

// --- Component Props & Types ---
type ProductFormValues = {
  name: string;
  scientific_name: string;
  sku: string;
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

// --- Reusable Section Header ---
const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      mb: 1.5,
      pb: 1,
      borderBottom: "2px solid",
      borderColor: "primary.light",
    }}
  >
    <Box
      sx={{
        p: 0.5,
        borderRadius: 1,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: "primary.main",
        display: "flex",
        alignItems: "center",
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="body2" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  </Box>
);

// --- Component Definition ---
const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaveSuccess,
  onDeleteSuccess,
}) => {
  const isEditMode = Boolean(productToEdit);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const [stockingUnits, setStockingUnits] = useState<Unit[]>([]);
  const [sellableUnits, setSellableUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);

  const [isStockingUnitModalOpen, setIsStockingUnitModalOpen] = useState(false);
  const [isSellableUnitModalOpen, setIsSellableUnitModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [historyTab, setHistoryTab] = useState(0);
  const [historyData, setHistoryData] = useState<unknown[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const form = useForm<ProductFormValues>({
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      scientific_name: "",
      sku: "",
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

  const fetchCategoriesForSelect = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await categoryService.getCategories(1, 9999, "", false, true);
      setCategories(data as Category[]);
    } catch (error) {
      toast.error("خطأ", {
        description: categoryService.getErrorMessage(error, "فشل تحميل الفئات"),
      });
    } finally {
      setLoadingCategories(false);
    }
  }, []);

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
      toast.error("خطأ", {
        description: unitService.getErrorMessage(error, "فشل تحميل الوحدات"),
      });
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  const handleCategoryCreated = useCallback(
    (newCategory: Category) => {
      setCategories((prev) => [...prev, newCategory]);
      form.setValue("category_id", String(newCategory.id));
      setIsCategoryModalOpen(false);
    },
    [form],
  );

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

  const fetchHistory = useCallback(
    async (productId: number, type: "purchases" | "sales", page: number) => {
      setHistoryLoading(true);
      try {
        const res =
          type === "purchases"
            ? await productService.getPurchaseHistory(productId, page)
            : await productService.getSalesHistory(productId, page);
        setHistoryData(res.data);
      } catch {
        toast.error("فشل تحميل السجل");
      } finally {
        setHistoryLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isEditMode && productToEdit && activeTab === 1) {
      fetchHistory(
        productToEdit.id,
        historyTab === 0 ? "purchases" : "sales",
        1,
      );
    }
  }, [activeTab, historyTab, isEditMode, productToEdit, fetchHistory]);

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

  const onSubmit = async (data: ProductFormValues) => {
    setServerError(null);

    const dataToSend: ProductFormData = {
      name: data.name,
      scientific_name: data.scientific_name || null,
      sku: data.sku || null,
      description: null,
      image_url: null,
      stocking_unit_id: data.stocking_unit_id ? Number(data.stocking_unit_id) : null,
      sellable_unit_id: data.sellable_unit_id ? Number(data.sellable_unit_id) : null,
      units_per_stocking_unit: Number(data.units_per_stocking_unit) || 1,
      category_id: data.category_id ? Number(data.category_id) : null,
      stock_quantity: 0,
      stock_alert_level: data.stock_alert_level ? Number(data.stock_alert_level) : null,
      sale_price: data.sale_price !== "" ? Number(data.sale_price) : null,
      cost_price: data.cost_price !== "" ? Number(data.cost_price) : null,
      expire_date: data.expire_date || null,
    };

    try {
      let savedProduct: Product;
      if (isEditMode && productToEdit) {
        savedProduct = await productService.updateProduct(productToEdit.id, dataToSend);
      } else {
        savedProduct = await productService.createProduct(dataToSend);
      }
      toast.success(isEditMode ? "تم تحديث المنتج بنجاح" : "تم إنشاء المنتج بنجاح", {
        duration: 3000,
      });
      onSaveSuccess(savedProduct);
      onClose();
    } catch (err) {
      const generalError = productService.getErrorMessage(err);
      const apiErrors = productService.getValidationErrors(err);
      toast.error("خطأ", { description: generalError, duration: 5000 });
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

  if (!isOpen) return null;

  const handleDelete = async () => {
    if (!productToEdit) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.")) return;
    try {
      await productService.deleteProduct(productToEdit.id);
      toast.success("تم حذف المنتج بنجاح");
      if (onDeleteSuccess) onDeleteSuccess();
      onClose();
    } catch (error) {
      toast.error("فشل حذف المنتج", {
        description: productService.getErrorMessage(error),
      });
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      transition: "box-shadow 0.2s ease",
      "&.Mui-focused": {
        boxShadow: (theme: import("@mui/material").Theme) => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.12)}`,
      },
    },
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      dir="rtl"
      PaperProps={{
        elevation: 8,
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      {/* ── Dialog Header ── */}
      <Box
        sx={{
          background: (theme) =>
            `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          px: 0.5,
          py: 0.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 0.75,
              bgcolor: "rgba(255,255,255,0.15)",
              borderRadius: 2,
              display: "flex",
              backdropFilter: "blur(4px)",
            }}
          >
            {isEditMode ? (
              <Edit3 size={18} color="white" />
            ) : (
              <Package size={18} color="white" />
            )}
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="white" lineHeight={1.2}>
              {isEditMode ? "تعديل منتج" : "إضافة منتج جديد"}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem" }}>
              {isEditMode
                ? `تعديل: ${productToEdit?.name}`
                : "أدخل بيانات المنتج بدقة لإدارة المخزون والمبيعات"}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={handleClose} disabled={isSubmitting} sx={{ color: "white" }}>
          <X size={20} />
        </IconButton>
      </Box>

      {/* ── Tabs (edit mode only) ── */}
      {isEditMode && (
        <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
          <Tabs
            value={activeTab}
            onChange={(_e, v) => setActiveTab(v)}
            textColor="primary"
            indicatorColor="primary"
            sx={{ px: 2 }}
          >
            <Tab
              label="تفاصيل المنتج"
              icon={<Package size={16} />}
              iconPosition="start"
              sx={{ minHeight: 48, gap: 0.5, fontWeight: 600 }}
            />
            <Tab
              label="سجل الحركات"
              icon={<History size={16} />}
              iconPosition="start"
              sx={{ minHeight: 48, gap: 0.5, fontWeight: 600 }}
            />
          </Tabs>
        </Box>
      )}

      <DialogContent sx={{ p: 3, maxHeight: "72vh", overflowY: "auto", bgcolor: (t) => alpha(t.palette.grey[100], 0.4) }}>

        {/* ── Server Error ── */}
        {serverError && !isSubmitting && (
          <Alert
            severity="error"
            icon={<AlertCircle size={18} />}
            sx={{ mb: 2.5, borderRadius: 2 }}
          >
            <AlertTitle sx={{ fontWeight: 700, mb: 0 }}>خطأ في الإدخال</AlertTitle>
            {serverError}
          </Alert>
        )}

        {/* ══════════════════════════════════════════════
            TAB 0 — Product Details
        ══════════════════════════════════════════════ */}
        {(!isEditMode || activeTab === 0) && (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>

            <Paper
              elevation={0}
              sx={{ p: 1, mb: 1, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
            >
              <SectionHeader
                icon={<Tag size={18} />}
                title="المعلومات الأساسية"
                subtitle="اسم المنتج، الرمز، والفئة"
              />

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {/* Name */}
                <Controller
                  control={control}
                  name="name"
                  rules={{
                    required: "اسم المنتج مطلوب",
                    minLength: { value: 2, message: "اسم المنتج يجب أن يكون حرفين على الأقل" },
                  }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="اسم المنتج *"
                      placeholder="اكتب اسم المنتج"
                      size="small"
                      disabled={isSubmitting}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{ ...fieldSx, flex: "1 1 180px" }}
                      onChange={(e) => {
                        field.onChange(e);
                        setValue("scientific_name", e.target.value, { shouldValidate: true, shouldDirty: true });
                      }}
                    />
                  )}
                />

                {/* Scientific Name */}
                <Controller
                  control={control}
                  name="scientific_name"
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="الاسم العلمي"
                      placeholder="(اختياري)"
                      size="small"
                      disabled={isSubmitting}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{ ...fieldSx, flex: "1 1 180px" }}
                    />
                  )}
                />

                {/* SKU */}
                <Controller
                  control={control}
                  name="sku"
                  render={({ field, fieldState }) => (
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", flex: "1 1 130px" }}>
                      <TextField
                        {...field}
                        value={field.value ?? ""}
                        label="الرمز (SKU)"
                        placeholder="(اختياري)"
                        size="small"
                        disabled={isSubmitting}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        sx={{ ...fieldSx, flexGrow: 1 }}
                        onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                      />
                      <Tooltip title="توليد رمز عشوائي">
                        <IconButton
                          size="small"
                          onClick={() => field.onChange(generateRandomSKU("PROD", 6))}
                          disabled={isSubmitting}
                          sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5 }}
                        >
                          <RefreshCw size={15} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />

                {/* Category */}
                <Controller
                  control={control}
                  name="category_id"
                  render={({ field, fieldState }) => (
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start",  }}>
                      <Autocomplete
                        sx={{ flexGrow: 1 }}
                        size="small"
                        options={categories}
                        loading={loadingCategories}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={categories.find((cat) => String(cat.id) === field.value) || null}
                        onChange={(_, newValue) => field.onChange(newValue ? String(newValue.id) : "")}
                        disabled={isSubmitting || loadingCategories}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="الفئة"
                            placeholder={loadingCategories ? "جاري التحميل..." : "اختر الفئة"}
                            error={!!fieldState.error}
                            helperText={fieldState.error?.message}
                            sx={fieldSx}
                          />
                        )}
                        noOptionsText="لا توجد فئات"
                      />
                      <Tooltip title="إضافة فئة جديدة">
                        <IconButton
                          size="small"
                          onClick={() => setIsCategoryModalOpen(true)}
                          disabled={isSubmitting}
                          sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, color: "primary.main" }}
                        >
                          <Plus size={15} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />
              </Box>

            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 1, mb: 1, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
            >
              <SectionHeader
                icon={<Layers size={18} />}
                title="الوحدات والمخزون"
                subtitle="وحدات التخزين والبيع وحد التنبيه"
              />

              {/* Single row: all 4 fields */}
              <Box sx={{ display: "flex", gap: 1 }}>

                {/* Stocking Unit */}
                <Controller
                  control={control}
                  name="stocking_unit_id"
                  render={({ field, fieldState }) => (
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", flex: 1 }}>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={stockingUnits}
                        loading={loadingUnits}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={stockingUnits.find((u) => String(u.id) === field.value) || null}
                        onChange={(_, newValue) => field.onChange(newValue ? String(newValue.id) : "")}
                        disabled={isSubmitting || loadingUnits}
                        renderInput={(params) => (
                          <TextField {...params} label="وحدة التخزين"
                            placeholder={loadingUnits ? "جاري التحميل..." : "اختر"}
                            error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                        )}
                        noOptionsText="لا توجد وحدات"
                      />
                      <Tooltip title="إضافة وحدة تخزين">
                        <IconButton size="small" onClick={() => setIsStockingUnitModalOpen(true)} disabled={isSubmitting}
                          sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, color: "primary.main" }}>
                          <Plus size={15} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />

                {/* Sellable Unit */}
                <Controller
                  control={control}
                  name="sellable_unit_id"
                  render={({ field, fieldState }) => (
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start", flex: 1 }}>
                      <Autocomplete
                        fullWidth
                        size="small"
                        options={sellableUnits}
                        loading={loadingUnits}
                        getOptionLabel={(option) => option.name || ""}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        value={sellableUnits.find((u) => String(u.id) === field.value) || null}
                        onChange={(_, newValue) => field.onChange(newValue ? String(newValue.id) : "")}
                        disabled={isSubmitting || loadingUnits}
                        renderInput={(params) => (
                          <TextField {...params} label="وحدة البيع"
                            placeholder={loadingUnits ? "جاري التحميل..." : "اختر"}
                            error={!!fieldState.error} helperText={fieldState.error?.message} sx={fieldSx} />
                        )}
                        noOptionsText="لا توجد وحدات"
                      />
                      <Tooltip title="إضافة وحدة بيع">
                        <IconButton size="small" onClick={() => setIsSellableUnitModalOpen(true)} disabled={isSubmitting}
                          sx={{ mt: 0.5, border: "1px solid", borderColor: "divider", borderRadius: 1.5, color: "primary.main" }}>
                          <Plus size={15} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  )}
                />

                {/* Units per stocking unit */}
                <Controller
                  control={control}
                  name="units_per_stocking_unit"
                  rules={{ required: "الحقل مطلوب", min: { value: 1, message: "يجب أن يكون 1 على الأقل" } }}
                  render={({ field, fieldState }) => (
                    <TextField {...field} label="الكمية في الوحدة *" type="number" size="small"
                      sx={{ ...fieldSx, flex: 1 }} inputProps={{ min: 1, step: 1 }}
                      disabled={isSubmitting} onFocus={(e) => e.target.select()}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      helperText={fieldState.error?.message || "مثال: 12"} error={!!fieldState.error} />
                  )}
                />

                {/* Stock Alert Level */}
                <Controller
                  control={control}
                  name="stock_alert_level"
                  rules={{ min: { value: 0, message: "لا يمكن أن يكون أقل من 0" } }}
                  render={({ field, fieldState }) => (
                    <TextField {...field} label="حد التنبيه" type="number" size="small"
                      sx={{ ...fieldSx, flex: 1 }} inputProps={{ min: 0, step: 1 }}
                      disabled={isSubmitting} onFocus={(e) => e.target.select()}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      helperText={fieldState.error?.message || "(اختياري)"} error={!!fieldState.error} />
                  )}
                />
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{ p: 1, mb: 1, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper" }}
            >
              <SectionHeader
                icon={<DollarSign size={18} />}
                title="الأسعار وتاريخ الصلاحية"
                subtitle="(اختياري) تلغي القيم المحسوبة من المشتريات"
              />

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {/* Cost Price */}
                <Controller
                  control={control}
                  name="cost_price"
                  rules={{ min: { value: 0, message: "السعر يجب أن يكون 0 أو أكثر" } }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="سعر التكلفة"
                      type="number"
                      
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
                  rules={{ min: { value: 0, message: "السعر يجب أن يكون 0 أو أكثر" } }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="سعر البيع"
                      type="number"
                      
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
                      label="تاريخ الصلاحية"
                      type="date"
                      
                      size="small"
                      disabled={isSubmitting}
                      InputLabelProps={{ shrink: true }}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      helperText={fieldState.error?.message}
                      error={!!fieldState.error}
                      sx={fieldSx}
                    />
                  )}
                />
              </Box>
            </Paper>

            {/* ── Actions ── */}
            <DialogActions
              sx={{
                mt: 2,
                px: 0,
                pb: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                الحقول المميزة بـ <span style={{ color: "red" }}>*</span> إلزامية
              </Typography>
              <Box sx={{ display: "flex", gap: 1.5 }}>
                {isEditMode && (
                  <Button
                    type="button"
                    onClick={handleDelete}
                    color="error"
                    variant="outlined"
                    disabled={isSubmitting}
                    startIcon={<Trash2 size={16} />}
                    sx={{ borderRadius: 2 }}
                  >
                    حذف
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outlined"
                  color="inherit"
                  disabled={isSubmitting}
                  sx={{ borderRadius: 2 }}
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Save size={16} />
                  }
                  sx={{ borderRadius: 2, px: 3, fontWeight: 700 }}
                >
                  {isEditMode ? "تحديث" : "حفظ"}
                </Button>
              </Box>
            </DialogActions>
          </Box>
        )}

        {/* ══════════════════════════════════════════════
            TAB 1 — History
        ══════════════════════════════════════════════ */}
        {isEditMode && activeTab === 1 && (
          <Box>
            <Tabs
              value={historyTab}
              onChange={(_e, v) => setHistoryTab(v)}
              variant="fullWidth"
              textColor="primary"
              indicatorColor="primary"
              sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
            >
              <Tab
                label="المشتروات"
                icon={<ShoppingCart size={16} />}
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
              <Tab
                label="المبيعات"
                icon={<TrendingUp size={16} />}
                iconPosition="start"
                sx={{ fontWeight: 600 }}
              />
            </Tabs>

            <Paper
              elevation={0}
              sx={{ border: 1, borderColor: "divider", borderRadius: 2.5, overflow: "hidden" }}
            >
              <TableContainer sx={{ maxHeight: 420 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.50" }}>التاريخ</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                        {historyTab === 0 ? "المورد" : "العميل"}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                        {historyTab === 0 ? "الكمية (تخزين)" : "الكمية (بيع)"}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.50" }}>
                        {historyTab === 0 ? "التكلفة" : "السعر"}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, bgcolor: "grey.50" }}>الإجمالي</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {historyLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Loader2 size={24} className="animate-spin mx-auto" style={{ color: "var(--primary)" }} />
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            جاري التحميل...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : historyData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <History size={32} style={{ opacity: 0.3, margin: "0 auto 8px" }} />
                          <Typography variant="body2" color="text.secondary">لا توجد سجلات</Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      historyData.map((item: any) => (
                        <TableRow key={item.id} hover>
                          <TableCell align="center">
                            <Chip
                              label={item.created_at ? new Date(item.created_at).toLocaleDateString("en-GB") : "---"}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell align="center">
                            {historyTab === 0
                              ? item.purchase?.supplier?.name || "—"
                              : item.sale?.client?.name || "—"}
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight={600}>{formatNumber(item.quantity)}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            {formatCurrency(historyTab === 0 ? item.unit_cost : item.unit_price)}
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight={700} color={historyTab === 0 ? "error.main" : "success.main"}>
                              {formatCurrency(historyTab === 0 ? item.total_cost : item.total_price)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />
              <Box sx={{ p: 2, display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2 }}>
                  إغلاق
                </Button>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>

      {/* Sub-modals */}
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
