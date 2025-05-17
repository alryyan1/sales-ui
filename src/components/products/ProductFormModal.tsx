// src/components/products/ProductFormModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Assuming you added shadcn Alert

// Services and Types
import productService, {
  Product,
  ProductFormData,
} from "../../services/productService"; // Adjust path
import categoryService, { Category } from "@/services/CategoryService";

// --- Zod Schema for Validation (Prices Removed, Category Added) ---
// --- Zod Schema for Product Form (Updated) ---


// --- Component Props ---
interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit: Product | null;
  onSaveSuccess: (product: Product) => void; // Callback with saved/created product
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
  ]);

const productFormSchema = z.object({
    name: z.string().min(1, { message: t("validation:required") }),
    sku: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
  category_id: z.preprocess(
    // Convert empty string or "0" to null for optional number
    (val) => (val === "" || val === "0" || val === 0 ? null : val),
    z
      .number()
      .positive({ message: t("validation:selectCategory") })
      .nullable()
      .optional() // Category is optional
  ),    // New Unit Fields
    stocking_unit_name: z.string().min(1, {message: t("validation:required")}).optional().default("Unit"), // Default if you want one
    sellable_unit_name: z.string().min(1, {message: t("validation:required")}).optional().default("Piece"), // Default
    units_per_stocking_unit: z.preprocess(
        (val) => (val === "" || Number(val) === 0 ? 1 : val), // Default to 1 if empty or 0
        z.coerce.number().int().min(1, { message: t("validation:minOne") })
    ).default(1),
    // stock_quantity represents initial total SELLABLE units when creating
    stock_quantity: z.coerce.number({invalid_type_error: t("validation:invalidInteger")}).int().min(0).default(0),
    stock_alert_level: z.coerce.number().int().min(0).nullable().optional(),
});
type ProductFormValues = z.infer<typeof productFormSchema>;



  const isEditMode = Boolean(productToEdit);

  // State for categories dropdown and general API errors
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // --- React Hook Form Setup ---
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      stocking_unit_name: "", // Default value
      sellable_unit_name: "", // Default value
      units_per_stocking_unit: 1, // Default to 1
      category_id: null, // Default to null (no category)
      stock_quantity: 0,
      stock_alert_level: 10, // Default to null or a number like 10
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    watch,
    formState: { isSubmitting, errors },
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
      ); // Fetch all flat for select
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

  // --- Effect to Populate/Reset Form and Fetch Categories ---
  useEffect(() => {
    if (isOpen) {
      setServerError(null); // Clear previous server errors
      fetchCategoriesForSelect(); // Fetch categories when modal opens

      if (isEditMode && productToEdit) {
        reset({
          name: productToEdit.name || "",
          sku: productToEdit.sku || "",
          description: productToEdit.description || "",
          stocking_unit_name: productToEdit.stocking_unit_name || "Unit",
          sellable_unit_name: productToEdit.sellable_unit_name || "Piece",
          units_per_stocking_unit:productToEdit.units_per_stocking_unit || 1,
          category_id: productToEdit.category_id || null, // Use product's category_id
          stock_quantity: Number(productToEdit.stock_quantity) || 0,
          stock_alert_level:
            productToEdit.stock_alert_level === null
              ? null
              : Number(productToEdit.stock_alert_level),
        });
      } else {
        // Reset to defaults for adding
        reset({
          name: "",
          sku: "",
          description: "",
          category_id: null,
          stocking_unit_name: "", // Default value
          sellable_unit_name: "", // Default value
          units_per_stocking_unit: 1, // Default to 1
          stock_quantity: 0,
          stock_alert_level: 10, // Example default alert level
        });
      }
    }
  }, [isOpen, isEditMode, productToEdit, reset, fetchCategoriesForSelect]); // Added fetchCategoriesForSelect

  // --- Form Submission Handler ---
  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    setServerError(null);
    console.log("Submitting product data:", data);

    // Ensure category_id is null if not selected, or a number
    const dataToSend: ProductFormData = {
      ...data,
      sku: data.sku || null,
      description: data.description || null,
      stocking_unit_name: data.stocking_unit_name,
      sellable_unit_name: data.sellable_unit_name ,
      units_per_stocking_unit: data.units_per_stocking_unit || 1,

      category_id: data.category_id ? Number(data.category_id) : null,
      stock_quantity: Number(data.stock_quantity), // Ensure number
      stock_alert_level:
        data.stock_alert_level !== null && data.stock_alert_level !== undefined
          ? Number(data.stock_alert_level)
          : null,
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
          isEditMode ? t("products:updateSuccess") : t("products:createSuccess")
        ), // Add keys
        duration: 3000,
      });

      onSaveSuccess(savedProduct); // Callback to parent
      onClose(); // Close the modal
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
          if (field in ({} as ProductFormValues)) {
            setError(field as keyof ProductFormValues, {
              type: "server",
              message: messages[0],
            });
          }
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
        
        {/* Adjusted width for more fields */}
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
                  <FormItem className="sm:col-span-2">
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

                {/* SKU Field */}
                <FormField
                  control={control}
                  name="sku"
                  render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:sku")}</FormLabel>
                    <FormControl>
                    <Input
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      placeholder={t("products:skuPlaceholder")}
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

                {/* Category Select */}
                <FormField
                  control={control}
                  name="category_id"
                  render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:category")}</FormLabel>
                    <Select
                    onValueChange={(value) =>
                      field.onChange(value ? Number(value) : null)
                    }
                    value={field.value ? String(field.value) : ""}
                    disabled={isSubmitting || loadingCategories}
                    >
                    <FormControl>
                      <SelectTrigger
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
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
                    <FormMessage>
                    {fieldState.error?.message
                      ? t(fieldState.error.message, {
                        field: t("products:category"),
                      } as any)
                      : null}
                    </FormMessage>
                  </FormItem>
                  )}
                />

                {/* Stocking Unit Name */}
                <FormField
                  control={control}
                  name="stocking_unit_name"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                    {t("products:stockingUnitName")}
                    <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                    <Input
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      placeholder={t("products:stockingUnitPlaceholder") || "e.g., Box, Carton"}
                      {...field}
                      value={field.value ?? ""}
                    />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                {/* Sellable Unit Name */}
                <FormField
                  control={control}
                  name="sellable_unit_name"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                    {t("products:sellableUnitName")}
                    <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                    <Input
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      placeholder={t("products:sellableUnitPlaceholder") || "e.g., Piece, Item"}
                      {...field}
                      value={field.value ?? ""}
                    />
                    </FormControl>
                    <FormMessage />
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
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="1"
                      {...field}
                    />
                    </FormControl>
                    <FormDescription className="text-gray-600 dark:text-gray-400">
                    {t("products:unitsPerStockingUnitDesc")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                {/* Initial Stock Quantity (Sellable Units) */}
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
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      type="number"
                      min="0"
                      step="1"
                      {...field}
                    />
                    </FormControl>
                    <FormDescription className="text-gray-600 dark:text-gray-400">
                    {t("products:initialStockDesc", {
                      unit: watch("sellable_unit_name") || t("products:sellableUnitDefault"),
                    })}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                  )}
                />

                {/* Stock Quantity Field */}
                {/* <FormField
                  control={control}
                  name="stock_quantity"
                  render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                    {t("products:stockQuantity")}
                    <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                    <Input
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={t("products:stockPlaceholder")}
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
                /> */}

                {/* Stock Alert Level Field */}
                <FormField
                  control={control}
                  name="stock_alert_level"
                  render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">{t("products:stockAlertLevel")}</FormLabel>
                    <FormControl>
                    <Input
                      className="bg-white dark:bg-gray-900 dark:text-gray-100"
                      type="number"
                      min="0"
                      step="1"
                      placeholder={t("products:stockAlertPlaceholder")}
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
    </Dialog>
  );
};

export default ProductFormModal;
