// src/components/products/ProductFormModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, RefreshCw, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const { t } = useTranslation([
    "products",
    "common",
    "validation",
    "categories",
    "units",
  ]);

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

      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "products:updateSuccess" : "products:createSuccess"
        ),
        duration: 3000,
      });

      onSaveSuccess(savedProduct);
      onClose();
    } catch (err) {
      console.error("Failed to save product:", err);
      const generalError = productService.getErrorMessage(err);
      const apiErrors = productService.getValidationErrors(err);

      toast.error(t("common:error"), {
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
        setServerError(t("validation:checkFields"));
      }
    }
  };

  // --- Render Modal ---
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isEditMode
                  ? t("products:editProduct")
                  : t("products:addProduct")}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* General Server Error Alert */}
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Grid layout for fields */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name Field */}
              
                <FormField
                  control={control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">
                        {t("products:name")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          className="bg-white dark:bg-gray-900 dark:text-gray-100"
                          placeholder={t("products:namePlaceholder")}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* Scientific Name Field */}
                <FormField
                  control={control}
                  name="scientific_name"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:scientificName")}</FormLabel>
                      <FormControl>
                        <Input
                          className="bg-white dark:bg-gray-900 dark:text-gray-100"
                          placeholder={t("products:scientificNamePlaceholder")}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* SKU Field */}
                <FormField
                  control={control}
                  name="sku"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:sku")}</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            className="bg-white dark:bg-gray-900 dark:text-gray-100 flex-1"
                            placeholder={t("products:skuPlaceholder")}
                            {...field}
                            value={field.value ?? ""}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const randomSKU = generateRandomSKU("PROD", 6);
                            field.onChange(randomSKU);
                          }}
                          disabled={isSubmitting}
                          className="shrink-0"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                        </Button>
                      </div>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* Category Select */}
                <FormField
                  control={control}
                  name="category_id"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:category")}</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting || loadingCategories}
                        >
                          <FormControl>
                            <SelectTrigger
                              className="bg-white dark:bg-gray-900 dark:text-gray-100 flex-1"
                              disabled={loadingCategories}
                            >
                              <SelectValue
                                placeholder={
                                  loadingCategories
                                    ? t("common:loading") + "..."
                                    : t("products:selectCategoryPlaceholder")
                                }
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-gray-900 dark:text-gray-100">
                            <SelectItem value=" ">
                              {t("products:noCategory")}
                            </SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsCategoryModalOpen(true)}
                          disabled={isSubmitting}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {t("products:addCategory")}
                        </Button>
                      </div>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* Stocking Unit Select */}
                <FormField
                  control={control}
                  name="stocking_unit_id"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:stockingUnit")}</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting || loadingUnits}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-900 dark:text-gray-100 flex-1">
                              <SelectValue placeholder={t("products:selectStockingUnit")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=" ">{t("products:noStockingUnit")}</SelectItem>
                            {stockingUnits.map((unit) => (
                              <SelectItem key={unit.id} value={String(unit.id)}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsStockingUnitModalOpen(true)}
                          disabled={isSubmitting}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                      
                        </Button>
                      </div>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* Sellable Unit Select */}
                <FormField
                  control={control}
                  name="sellable_unit_id"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:sellableUnit")}</FormLabel>
                      <div className="flex gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting || loadingUnits}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-gray-900 dark:text-gray-100 flex-1">
                              <SelectValue placeholder={t("products:selectSellableUnit")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value=" ">{t("products:noSellableUnit")}</SelectItem>
                            {sellableUnits.map((unit) => (
                              <SelectItem key={unit.id} value={String(unit.id)}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSellableUnitModalOpen(true)}
                          disabled={isSubmitting}
                          className="shrink-0"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                      
                        </Button>
                      </div>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* Units Per Stocking Unit */}
                <FormField
                  control={control}
                  name="units_per_stocking_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">
                        {t("products:unitsPerStockingUnit")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          onFocus={(e) => e.target.select()}
                          className="bg-white dark:bg-gray-900 dark:text-gray-100"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600 dark:text-gray-400">
                        {t("products:unitsPerStockingUnitDesc")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Initial Stock Quantity */}
                <FormField
                  control={control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">
                        {t("products:initialStockQuantity")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          onFocus={(e) => e.target.select()}
                          className="bg-white dark:bg-gray-900 dark:text-gray-100"
                          type="number"
                          min="0"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription className="text-gray-600 dark:text-gray-400">
                        {t("products:initialStockDesc", {
                          unit: t("products:sellableUnitDefault"),
                        })}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Stock Alert Level Field */}
                <FormField
                  control={control}
                  name="stock_alert_level"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:stockAlertLevel")}</FormLabel>
                      <FormControl>
                        <Input
                          onFocus={(e) => e.target.select()}
                          className="bg-white dark:bg-gray-900 dark:text-gray-100"
                          type="number"
                          min="0"
                          step="1"
                          placeholder={t("products:stockAlertPlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />

                {/* Description Field */}
                <FormField
                  control={control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:description")}</FormLabel>
                      <FormControl>
                        <Textarea
                          className="resize-y min-h-[100px] bg-white dark:bg-gray-900 dark:text-gray-100"
                          placeholder={t("products:descriptionPlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && ( 
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? t("common:update") : t("common:create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
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
