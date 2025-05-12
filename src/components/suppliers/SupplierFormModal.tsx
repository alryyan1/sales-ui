// src/components/suppliers/SupplierFormModal.tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from 'lucide-react';
// Optional: Add shadcn Alert if needed for server errors
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Services and Types
import supplierService, { Supplier, SupplierFormData } from '../../services/supplierService'; // Adjust path

// --- Zod Schema for Validation ---
const supplierFormSchema = z.object({
    name: z.string().min(1, { message: "validation:required" }),
    contact_person: z.string().nullable().optional(),
    email: z.string().email({ message: "validation:email" }).nullable().or(z.literal('')).optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    // Add website, notes schema if those fields exist
});

// Infer TypeScript type
type SupplierFormValues = z.infer<typeof supplierFormSchema>;

// --- Component Props ---
interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplierToEdit: Supplier | null;
    onSaveSuccess: () => void;
}

// --- Component Definition ---
const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
    isOpen,
    onClose,
    supplierToEdit,
    onSaveSuccess
}) => {
    const { t } = useTranslation(['suppliers', 'common', 'validation']);
    const isEditMode = Boolean(supplierToEdit);

    // State for general API errors
    const [serverError, setServerError] = useState<string | null>(null);

    // --- React Hook Form Setup with Zod ---
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: { // Match schema
            name: '',
            contact_person: '', // Handles nullable/optional/empty string
            email: '',
            phone: '',
            address: '',
        },
    });

    const { handleSubmit, control, reset, formState: { isSubmitting }, setError } = form;

    // --- Effect to Populate/Reset Form ---
    useEffect(() => {
        if (isOpen) {
            setServerError(null);
            if (isEditMode && supplierToEdit) {
                reset({ // Populate with existing data
                    name: supplierToEdit.name || '',
                    contact_person: supplierToEdit.contact_person || '',
                    email: supplierToEdit.email || '',
                    phone: supplierToEdit.phone || '',
                    address: supplierToEdit.address || '',
                });
            } else {
                reset({ // Match schema
            name: '',
            contact_person: '', // Handles nullable/optional/empty string
            email: '',
            phone: '',
            address: '',
        }); // Reset to defaults for adding
            }
        }
    }, [isOpen, isEditMode, supplierToEdit, reset]);

    // --- Form Submission Handler ---
    const onSubmit: SubmitHandler<SupplierFormValues> = async (data) => {
        setServerError(null);
        console.log('Submitting supplier data:', data);

        // Prepare data for API (ensure empty strings become null)
        const dataToSend = {
            ...data,
            contact_person: data.contact_person || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
        };

        try {
            let savedSupplier: Supplier;
            if (isEditMode && supplierToEdit) {
                savedSupplier = await supplierService.updateSupplier(supplierToEdit.id, dataToSend);
            } else {
                savedSupplier = await supplierService.createSupplier(dataToSend);
            }
            console.log('Save successful:', savedSupplier);

            toast.success(t('common:success'), {
                description: t(isEditMode ? 'suppliers:saveSuccess' : 'suppliers:saveSuccess'),
                duration: 3000,
            });

            onSaveSuccess();
            onClose();

        } catch (err) {
            console.error("Failed to save supplier:", err);
            const generalError = supplierService.getErrorMessage(err);
            const apiErrors = supplierService.getValidationErrors(err);

            toast.error(t('common:error'), { description: generalError, duration: 5000 });
            setServerError(generalError);

            if (apiErrors) {
                Object.entries(apiErrors).forEach(([field, messages]) => {
                    if (field in ({} as SupplierFormValues)) {
                        setError(field as keyof SupplierFormValues, {
                            type: 'server', message: messages[0]
                        });
                    }
                });
                setServerError(t('validation:checkFields'));
            }
        }
    };

    // --- Render Modal ---
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-xl p-0"> {/* Standard modal width */}
                <Form {...form}>
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        {/* Dialog Header */}
                        <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
                            <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                {isEditMode ? t('suppliers:editSupplier') : t('suppliers:addSupplier')}
                            </DialogTitle>
                        </DialogHeader>

                        {/* Scrollable Content Area */}
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* General Server Error Alert */}
                            {serverError && !isSubmitting && (
                                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-600" role="alert">
                                    <div className="flex items-center"><AlertCircle className="h-4 w-4 me-2" /><p>{serverError}</p></div>
                                </div>
                                // Or shadcn Alert: <Alert variant="destructive">...</Alert>
                            )}

                            {/* Grid layout for fields */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Supplier Name Field */}
                                <FormField
                                    control={control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2"> {/* Span full width */}
                                            <FormLabel>{t('suppliers:name')} <span className="text-red-500">*</span></FormLabel>
                                            <FormControl><Input placeholder={t('suppliers:namePlaceholder')} {...field} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Contact Person Field */}
                                <FormField
                                    control={control}
                                    name="contact_person"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('suppliers:contactPerson')}</FormLabel>
                                            <FormControl><Input placeholder={t('suppliers:contactPersonPlaceholder')} {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Email Field */}
                                <FormField
                                    control={control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('suppliers:email')}</FormLabel>
                                            <FormControl><Input type="email" placeholder={t('suppliers:emailPlaceholder')} {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Phone Field */}
                                <FormField
                                    control={control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>{t('suppliers:phone')}</FormLabel>
                                            <FormControl><Input type="tel" placeholder={t('suppliers:phonePlaceholder')} {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Address Field */}
                                <FormField
                                    control={control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2"> {/* Span full width */}
                                            <FormLabel>{t('suppliers:address')}</FormLabel>
                                            <FormControl><Textarea placeholder={t('suppliers:addressPlaceholder')} className="resize-y min-h-[80px]" {...field} value={field.value ?? ''} disabled={isSubmitting} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Add website/notes fields here similarly if needed */}
                            </div> {/* End Grid */}
                        </div> {/* End Scrollable Content */}

                        {/* Dialog Footer */}
                        <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
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

export default SupplierFormModal;