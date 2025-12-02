// src/components/products/ProductFormModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  AlertTitle,
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
      toast.error(t("common:error"), {
        description: categoryService.getErrorMessage(
          error,
          t("categories:fetchError")
        ),
      });
    } finally {
      setLoadingCategories(false);
    }
  }, [t]);

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
      toast.error(t("common:error"), {
        description: unitService.getErrorMessage(
          error,
          t("units:fetchError")
        ),
      });
    } finally {
      setLoadingUnits(false);
    }
  }, [t]);

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

      toast.success("تم الحفظ بنجاح", {
        description: isEditMode
          ? "تم تحديث بيانات المنتج بنجاح"
          : "تم إضافة المنتج بنجاح",
        duration: 3000,
      });

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
            message: messages[0],
          });
        });
        setServerError("يرجى التحقق من الحقول المدخلة.");
      }
    }
  };

  // --- Render Modal ---
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {isEditMode ? "تعديل منتج" : "إضافة منتج"}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1 }}
        >
          {serverError && !isSubmitting && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>خطأ</AlertTitle>
              {serverError}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <TextField
              label="اسم المنتج"
              fullWidth
              required
              placeholder="أدخل اسم المنتج"
              disabled={isSubmitting}
              {...form.register("name")}
            />

            <TextField
              label="الاسم العلمي"
              fullWidth
              placeholder="أدخل الاسم العلمي (اختياري)"
              disabled={isSubmitting}
              {...form.register("scientific_name")}
            />

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                label="SKU"
                fullWidth
                placeholder="رمز المنتج (اختياري)"
                disabled={isSubmitting || isEditMode}
                {...form.register("sku")}
              />
              <Button
                type="button"
                variant="outlined"
                size="small"
                onClick={() => {
                  const randomSKU = generateRandomSKU("PROD", 6);
                  form.setValue("sku", randomSKU);
                }}
                disabled={isSubmitting || isEditMode}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
              </Button>
            </Box>

            <TextField
              select
              label="الفئة"
              fullWidth
              disabled={isSubmitting || loadingCategories}
              {...form.register("category_id")}
              SelectProps={{ native: false }}
            >
              <MenuItem value="">
                <em>بدون فئة</em>
              </MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </MenuItem>
              ))}
            </TextField>

            {/* يمكن لاحقًا إضافة حقول الوحدات والمخزون بالعربية بنفس النمط */}

            <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}>
              <TextField
                label="الوصف"
                fullWidth
                multiline
                minRows={3}
                placeholder="وصف مختصر للمنتج (اختياري)"
                disabled={isSubmitting}
                {...form.register("description")}
              />
            </Box>
          </Box>

          <DialogActions sx={{ mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              حفظ
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
