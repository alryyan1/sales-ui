// src/components/products/ProductFormModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { toast } from "sonner";

// MUI components
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { Loader2, AlertCircle, RefreshCw, Plus } from "lucide-react";

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

// --- Component Props ---
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSaveSuccess: (product: Product) => void;
}

// --- Component Definition ---
const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSaveSuccess,
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

  // --- React Hook Form Setup ---
  const form = useForm({
    defaultValues: {
      name: "",
      scientific_name: "",
      sku: "",
      description: "",
      stocking_unit_id: "",
      sellable_unit_id: "",
      units_per_stocking_unit: 1,
      category_id: "",
      stock_quantity: 0,
      stock_alert_level: 10,
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
        true
      );
      setCategories(data as Category[]);
    } catch (error) {
      console.error("Error fetching categories for product form:", error);
      toast.error("خطأ", {
        description: categoryService.getErrorMessage(
          error,
          "فشل تحميل الفئات"
        ),
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
        description: unitService.getErrorMessage(
          error,
          "فشل تحميل الوحدات"
        ),
      });
    } finally {
      setLoadingUnits(false);
    }
  }, []);

  // --- Handle Category Creation Success ---
  const handleCategoryCreated = useCallback((newCategory: Category) => {
    setCategories(prev => [...prev, newCategory]);
    form.setValue("category_id", String(newCategory.id));
    setIsCategoryModalOpen(false);
  }, [form]);

  // --- Handle Unit Creation Success ---
  const handleStockingUnitCreated = useCallback((newUnit: Unit) => {
    setStockingUnits(prev => [...prev, newUnit]);
    form.setValue("stocking_unit_id", String(newUnit.id));
    setIsStockingUnitModalOpen(false);
  }, [form]);

  const handleSellableUnitCreated = useCallback((newUnit: Unit) => {
    setSellableUnits(prev => [...prev, newUnit]);
    form.setValue("sellable_unit_id", String(newUnit.id));
    setIsSellableUnitModalOpen(false);
  }, [form]);

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
          description: productToEdit.description || "",
          stocking_unit_id: productToEdit.stocking_unit_id ? String(productToEdit.stocking_unit_id) : "",
          sellable_unit_id: productToEdit.sellable_unit_id ? String(productToEdit.sellable_unit_id) : "",
          units_per_stocking_unit: productToEdit.units_per_stocking_unit || 1,
          category_id: productToEdit.category_id ? String(productToEdit.category_id) : "",
          stock_quantity: Number(productToEdit.stock_quantity) || 0,
          stock_alert_level: productToEdit.stock_alert_level || 10,
        });
      } else {
        reset({
          name: "",
          scientific_name: "",
          sku: "",
          description: "",
          category_id: "",
          stocking_unit_id: "",
          sellable_unit_id: "",
          units_per_stocking_unit: 1,
          stock_quantity: 0,
          stock_alert_level: 10,
        });
      }
    }
  }, [isOpen, isEditMode, productToEdit, reset, fetchCategoriesForSelect, fetchUnitsForSelect]);

  // --- Form Submission Handler ---
  const onSubmit = async (data: {
    name: string;
    scientific_name: string;
    sku: string;
    description: string;
    stocking_unit_id: string;
    sellable_unit_id: string;
    units_per_stocking_unit: number;
    category_id: string;
    stock_quantity: number;
    stock_alert_level: number | null;
  }) => {
    setServerError(null);
    console.log("Submitting product data:", data);

    const dataToSend: ProductFormData = {
      name: data.name,
      scientific_name: data.scientific_name || null,
      sku: data.sku || null,
      description: data.description || null,
      stocking_unit_id: data.stocking_unit_id ? Number(data.stocking_unit_id) : null,
      sellable_unit_id: data.sellable_unit_id ? Number(data.sellable_unit_id) : null,
      units_per_stocking_unit: Number(data.units_per_stocking_unit) || 1,
      category_id: data.category_id ? Number(data.category_id) : null,
      stock_quantity: Number(data.stock_quantity),
      stock_alert_level: data.stock_alert_level ? Number(data.stock_alert_level) : null,
    };

    try {
      let savedProduct: Product;
      if (isEditMode && productToEdit) {
        savedProduct = await productService.updateProduct(
          productToEdit.id,
          dataToSend
        );
      } else {
        savedProduct = await productService.createProduct(dataToSend);
      }
      console.log("Save successful:", savedProduct);

      toast.success(
        isEditMode ? "تم تحديث المنتج بنجاح" : "تم إنشاء المنتج بنجاح",
        { duration: 3000 }
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

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle sx={{ pb: 1, direction: "rtl" }}>
        {isEditMode ? "تعديل منتج" : "إضافة منتج جديد"}
      </DialogTitle>
      <DialogContent
        sx={{
          pt: 1,
          maxHeight: "70vh",
          overflowY: "auto",
          direction: "rtl",
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1 }}
        >
          {/* General Server Error Alert */}
          {serverError && !isSubmitting && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>خطأ</AlertTitle>
              </Box>
              {serverError}
            </Alert>
          )}

          {/* Grid layout for fields */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Name Field */}
            <Controller
              control={control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="اسم المنتج"
                  placeholder="اكتب اسم المنتج"
                  fullWidth
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
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
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    {...field}
                    value={field.value ?? ""}
                    label="الرمز (SKU)"
                    placeholder="(اختياري) رمز المنتج في النظام"
                    fullWidth
                    disabled={isSubmitting || isEditMode}
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
                    disabled={isSubmitting || isEditMode}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </Box>
              )}
            />

            {/* Category Select */}
            <Controller
              control={control}
              name="category_id"
              render={({ field, fieldState }) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FormControl fullWidth size="small" disabled={isSubmitting || loadingCategories}>
                    <InputLabel>الفئة</InputLabel>
                    <Select
                      {...field}
                      label="الفئة"
                      value={field.value}
                    >
                      <MenuItem value="">
                        <em>بدون فئة</em>
                      </MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setIsCategoryModalOpen(true)}
                    disabled={isSubmitting}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Box>
              )}
            />

            {/* Stocking Unit Select */}
            <Controller
              control={control}
              name="stocking_unit_id"
              render={({ field, fieldState }) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FormControl fullWidth size="small" disabled={isSubmitting || loadingUnits}>
                    <InputLabel>وحدة التخزين</InputLabel>
                    <Select
                      {...field}
                      label="وحدة التخزين"
                      value={field.value}
                    >
                      <MenuItem value="">
                        <em>بدون وحدة تخزين</em>
                      </MenuItem>
                      {stockingUnits.map((unit) => (
                        <MenuItem key={unit.id} value={String(unit.id)}>
                          {unit.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setIsStockingUnitModalOpen(true)}
                    disabled={isSubmitting}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Box>
              )}
            />

            {/* Sellable Unit Select */}
            <Controller
              control={control}
              name="sellable_unit_id"
              render={({ field, fieldState }) => (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <FormControl fullWidth size="small" disabled={isSubmitting || loadingUnits}>
                    <InputLabel>وحدة البيع</InputLabel>
                    <Select
                      {...field}
                      label="وحدة البيع"
                      value={field.value}
                    >
                      <MenuItem value="">
                        <em>بدون وحدة بيع</em>
                      </MenuItem>
                      {sellableUnits.map((unit) => (
                        <MenuItem key={unit.id} value={String(unit.id)}>
                          {unit.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setIsSellableUnitModalOpen(true)}
                    disabled={isSubmitting}
                    sx={{ minWidth: 0, px: 1.5 }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </Box>
              )}
            />

            {/* Units Per Stocking Unit */}
            <Controller
              control={control}
              name="units_per_stocking_unit"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="عدد الوحدات في وحدة التخزين"
                  type="number"
                  fullWidth
                  inputProps={{ min: 1, step: 1 }}
                  disabled={isSubmitting}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  helperText={
                    fieldState.error?.message ||
                    "عدد الوحدات البيعية داخل وحدة التخزين (مثال: 12 حبة في كرتونة)."
                  }
                  error={!!fieldState.error}
                />
              )}
            />

            {/* Initial Stock Quantity */}
            <Controller
              control={control}
              name="stock_quantity"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="الكمية الابتدائية في المخزون"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 1 }}
                  disabled={isSubmitting}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  helperText={
                    fieldState.error?.message ||
                    "الكمية الحالية من المنتج في المخزون (بوحدة البيع)."
                  }
                  error={!!fieldState.error}
                />
              )}
            />

            {/* Stock Alert Level Field */}
            <Controller
              control={control}
              name="stock_alert_level"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="حد تنبيه انخفاض المخزون"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, step: 1 }}
                  disabled={isSubmitting}
                  onFocus={(e) => e.target.select()}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  helperText={
                    fieldState.error?.message ||
                    "عند الوصول لهذه الكمية سيتم إظهار تنبيه بانخفاض المخزون (اختياري)."
                  }
                  error={!!fieldState.error}
                />
              )}
            />

            {/* Description Field */}
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="الوصف"
                  placeholder="(اختياري) تفاصيل إضافية عن المنتج"
                  fullWidth
                  multiline
                  minRows={3}
                  disabled={isSubmitting}
                  value={field.value ?? ""}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ gridColumn: { xs: "1 / -1", sm: "1 / -1" } }}
                />
              )}
            />
          </Box>

          <DialogActions sx={{ mt: 2 }}>
            <Button
              type="button"
              onClick={onClose}
              color="inherit"
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : undefined
              }
            >
              {isEditMode ? "تحديث" : "حفظ"}
            </Button>
          </DialogActions>
        </Box>
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
