// src/components/products/ProductFormModal.tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod'; // Import Zod
import { zodResolver } from '@hookform/resolvers/zod'; // Import Zod resolver
import { toast } from "sonner"; // Import Sonner's toast function
import { Loader2 } from 'lucide-react'; // Loading spinner icon

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription, // Optional
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose, // Use for cancel/close buttons
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription, // Optional
    FormField,
    FormItem,
    FormLabel,
    FormMessage, // Displays validation errors
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Services and Types
import productService, { Product } from '../../services/productService'; // Adjust path as needed

// --- Zod Schema for Validation ---
// Defines the structure and validation rules for the form data.
const productFormSchema = z.object({
    // Name: required string, min 1 char
    name: z.string().min(1, { message: "validation:required" }),
    // SKU: string, nullable, optional (can be empty, null, or undefined)
    sku: z.string().nullable().optional(),
    // Description: string, nullable, optional
    description: z.string().nullable().optional(),
    // Purchase Price: preprocess empty string to undefined, then coerce to number, must be >= 0
  // Default to 0 if validation passes but value is undefined
    // Sale Price: Same validation as purchase price

    // Stock Quantity: Preprocess, coerce to integer, must be >= 0
    stock_quantity: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce
         .number({ invalid_type_error: "validation:invalidInteger" })
         .int({ message: "validation:invalidInteger" })
         .min(0, { message: "validation:minZero" })
         .optional()
    ).default(0),
    // Stock Alert Level: Preprocess, coerce to integer, must be >= 0, nullable, optional
    stock_alert_level: z.preprocess(
        (val) => (val === "" ? undefined : val),
        z.coerce
         .number({ invalid_type_error: "validation:invalidInteger" })
         .int({ message: "validation:invalidInteger" })
         .min(0, { message: "validation:minZero" })
         .nullable() // Allow explicit null
         .optional() // Allow undefined
    ),
});

// Infer the TypeScript type from the Zod schema for type safety
type ProductFormValues = z.infer<typeof productFormSchema>;

// --- Component Props ---
interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    productToEdit: Product | null;
    onSaveSuccess: () => void;
}

// --- Component Definition ---
const ProductFormModal: React.FC<ProductFormModalProps> = ({
    isOpen,
    onClose,
    productToEdit,
    onSaveSuccess
}) => {
    const { t } = useTranslation(['products', 'common', 'validation']); // Load necessary translation namespaces
    const isEditMode = Boolean(productToEdit);

    // State for general API error messages (not field-specific validation)
    const [serverError, setServerError] = useState<string | null>(null);

    // --- React Hook Form Setup with Zod ---
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productFormSchema), // Use the Zod resolver
        defaultValues: { // Initialize based on expected types after Zod processing
            name: '',
            sku: '', // Will become null if empty string is submitted, handled by schema/onSubmit logic
            description: '', // Will become null if empty string is submitted
            stock_quantity: 0,
            stock_alert_level: null, // Default to null explicitly
        },
    });

    const { handleSubmit, control, reset, formState: { isSubmitting }, setError } = form;

    // --- Effect to Populate/Reset Form ---
    useEffect(() => {
        if (isOpen) {
            console.log("Product Modal opened. Edit mode:", isEditMode, "Product:", productToEdit);
            setServerError(null); // Clear previous server errors on open
            if (isEditMode && productToEdit) {
                // Populate form with data from productToEdit
                // Ensure data types match the form expectations (numbers for Zod number type)
                reset({
                    name: productToEdit.name || '',
                    sku: productToEdit.sku || '', // Keep as string for input
                    description: productToEdit.description || '', // Keep as string for input
                    stock_quantity: Number(productToEdit.stock_quantity) || 0,
                    stock_alert_level: productToEdit.stock_alert_level === null ? null : Number(productToEdit.stock_alert_level), // Handle null explicitly
                });
            } else {
                // Reset to default values defined in useForm for adding
                reset();
            }
        }
    }, [isOpen, isEditMode, productToEdit, reset]);


    // --- Form Submission Handler ---
    const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
        setServerError(null); // Clear previous API error messages
        console.log('Submitting validated data:', data);

        // Prepare data for API (Zod schema already handled coercion to numbers/nulls)
        // Ensure optional empty strings become null if API expects null
        const dataToSend = {
            ...data,
            sku: data.sku || null,
            description: data.description || null,
            stock_alert_level:data.stock_alert_level  ?? null
            // stock_alert_level is already potentially null from Zod schema
        };

        try {
            let savedProduct: Product;
            if (isEditMode && productToEdit) {
                // Call update service
                savedProduct = await productService.updateProduct(productToEdit.id, dataToSend);
            } else {
                // Call create service
                // Cast dataToSend to ensure all fields are present if API requires them
                savedProduct = await productService.createProduct(dataToSend as Required<typeof dataToSend>);
            }
            console.log('Save successful:', savedProduct);

            // Show success toast using Sonner
            toast.success(t('common:success'), {
                description: t(isEditMode ? 'products:saveSuccess' : 'products:saveSuccess'),
                duration: 3000, // Auto-close after 3 seconds
            });

            onSaveSuccess(); // Call parent callback (e.g., refetch data)
            onClose(); // Close the modal

        } catch (err) {
            console.error("Failed to save product:", err);
            const generalError = productService.getErrorMessage(err);
            const apiErrors = productService.getValidationErrors(err);

            // Show error toast using Sonner
            toast.error(t('common:error'), {
                description: generalError, // Display the main error message
                duration: 5000,
            });

            // Set general server error for display within the modal (optional)
            setServerError(generalError);

            // Map API validation errors back to the form fields if they exist
            if (apiErrors) {
                Object.entries(apiErrors).forEach(([field, messages]) => {
                    // Check if the field name is valid for our form type
                    if (field in ({} as ProductFormValues)) {
                        setError(field as keyof ProductFormValues, {
                            type: 'server',
                            message: messages[0] // Show the first error message from the server
                        });
                    }
                });
            }
        }
        // isSubmitting is automatically handled by RHF and its promise resolution
    };

    // --- Render Modal ---
    return (
        // Dialog controlled by isOpen prop, onClose triggered by DialogClose or overlay click
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl p-0"> {/* Use larger width for product form */}
                {/* Form integrates with RHF */}
                <Form {...form}>
                    {/* Use standard form tag for submission */}
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        {/* Header */}
                        <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
                            <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {isEditMode ? t('products:editProduct') : t('products:addProduct')}
                            </DialogTitle>
                            {/* Optional Description */}
                            {/* <DialogDescription>{t('products:formDescription')}</DialogDescription> */}
                        </DialogHeader>

                        {/* Scrollable Content Area */}
                        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                             {/* General Server Error Alert */}
                            {serverError && (
                                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded dark:bg-red-900 dark:text-red-200 dark:border-red-600" role="alert">
                                    <p>{serverError}</p>
                                </div>
                            )}

                            {/* Grid Layout for Fields */}
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                {/* Name Field - Span full width */}
                                <FormField
                                    control={control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>{t('products:name')} <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder={t('products:productNamePlaceholder') || 'e.g., Gaming Laptop X'} {...field} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* SKU Field */}
                                <FormField
                                    control={control}
                                    name="sku"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('products:sku')}</FormLabel>
                                            <FormControl><Input placeholder={t('products:skuPlaceholder') || 'e.g., GLX-001'} {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Stock Quantity Field */}
                                <FormField
                                    control={control}
                                    name="stock_quantity"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('products:stockQuantity')} <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input type="number" min="0" step="1" placeholder="0" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                              

                                {/* Stock Alert Level Field */}
                                <FormField
                                    control={control}
                                    name="stock_alert_level"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('products:stockAlertLevel')}</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" step="1" placeholder="10" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                                            </FormControl>
                                             <FormDescription>{t('products:stockAlertDescription')}</FormDescription> {/* Add key */}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Description Field - Span full width */}
                                <FormField
                                    control={control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>{t('products:description')}</FormLabel>
                                            <FormControl><Textarea placeholder={t('products:descriptionPlaceholder') || 'Details about the product...'} className="resize-y min-h-[100px]" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Footer with Action Buttons */}
                        <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
                            {/* DialogClose automatically triggers onOpenChange(false) */}
                            <DialogClose asChild>
                                <Button type="button" variant="ghost" disabled={isSubmitting}>{t('common:cancel')}</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                                {t('common:save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default ProductFormModal;