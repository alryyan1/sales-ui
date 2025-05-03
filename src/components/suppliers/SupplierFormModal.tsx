// src/components/suppliers/SupplierFormModal.tsx
import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

// MUI Components (reuse from ClientFormModal)
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

// Services and Types
import supplierService, { Supplier, SupplierFormData } from '../../services/supplierService'; // Adjust path

// Props definition
interface SupplierFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplierToEdit: Supplier | null; // Use Supplier type
    onSaveSuccess: () => void;
}

// Validation errors type
interface SupplierValidationErrors {
    name?: string[];
    contact_person?: string[];
    email?: string[];
    phone?: string[];
    address?: string[];
    [key: string]: string[] | undefined;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
    isOpen,
    onClose,
    supplierToEdit,
    onSaveSuccess
}) => {
    const { t } = useTranslation(['suppliers', 'common', 'validation']);
    const isEditMode = Boolean(supplierToEdit);

    // RHF Setup
    const {
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting },
        setError,
    } = useForm<SupplierFormData>({
        defaultValues: { // Match SupplierFormData fields
            name: '', contact_person: '', email: '', phone: '', address: '',
        },
    });

    // Server error state
    const [serverError, setServerError] = useState<string | null>(null);

    // Effect to populate/reset form
    useEffect(() => {
        if (isOpen) {
            if (isEditMode && supplierToEdit) {
                reset({ // Populate with supplier data
                    name: supplierToEdit.name || '',
                    contact_person: supplierToEdit.contact_person || '',
                    email: supplierToEdit.email || '',
                    phone: supplierToEdit.phone || '',
                    address: supplierToEdit.address || '',
                });
            } else {
                reset(); // Reset for adding
            }
            setServerError(null); // Clear errors
        }
    }, [isOpen, isEditMode, supplierToEdit, reset]);

    // Submission Handler
    const onSubmit: SubmitHandler<SupplierFormData> = async (data) => {
        setServerError(null);
        const dataToSend: Partial<SupplierFormData> = {};
         Object.entries(data).forEach(([key, value]) => {
             dataToSend[key as keyof SupplierFormData] = value === '' ? null : value;
         });

        try {
            if (isEditMode && supplierToEdit) {
                await supplierService.updateSupplier(supplierToEdit.id, dataToSend);
            } else {
                await supplierService.createSupplier(dataToSend as SupplierFormData);
            }
            onSaveSuccess();
        } catch (err) {
            console.error("Failed to save supplier:", err);
            const apiErrors = supplierService.getValidationErrors(err);
            const generalError = supplierService.getErrorMessage(err);

            if (apiErrors) {
                 Object.entries(apiErrors).forEach(([field, messages]) => {
                     if (field in ({} as SupplierFormData)) {
                         setError(field as keyof SupplierFormData, { type: 'server', message: messages[0] });
                     }
                 });
                 setServerError(t('validation:checkFields'));
            } else {
                setServerError(generalError);
            }
        }
    };

    // Safe close handler
    const handleClose = () => { if (!isSubmitting) onClose(); };

    // Render Modal
    if (!isOpen) return null;

    return (
        <Dialog
            // style={{direction:'rtl'}}
            open={isOpen}
            onClose={handleClose}
            fullWidth
            // maxWidth="md"
            disableEscapeKey={isSubmitting}
            PaperProps={{ component: 'form', onSubmit: handleSubmit(onSubmit), noValidate: true }}
            sx={{ '& .MuiDialog-paper': { borderRadius: '8px' } }}
        >
            <DialogTitle sx={{ py: 2, px: 3, borderBottom: 1, borderColor: 'divider' }}>
                {isEditMode ? t('suppliers:editSupplier') : t('suppliers:addSupplier')} {/* Add keys */}
                <IconButton aria-label="close" onClick={handleClose} disabled={isSubmitting} sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ px: 3, py: { xs: 2, sm: 3 } }}>
                 {serverError && ( <Alert severity="error" sx={{ mb: 2 }} onClose={() => setServerError(null)}>{serverError}</Alert> )}

                <Grid  spacing={3}>
                    {/* Name Field */}
                    <Grid >
                         <Controller name="name" control={control} rules={{ required: t('validation:required') || true }}
                             render={({ field, fieldState }) => ( <TextField {...field} label={`${t('suppliers:name')} *`} variant="outlined" fullWidth required error={!!fieldState.error} helperText={fieldState.error?.message || ' '} disabled={isSubmitting} /> )}
                         />
                    </Grid>
                    {/* Contact Person Field */}
                    <Grid >
                         <Controller name="contact_person" control={control}
                             render={({ field, fieldState }) => ( <TextField {...field} label={t('suppliers:contactPerson')} variant="outlined" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message || ' '} disabled={isSubmitting} /> )}
                         />
                    </Grid>
                    {/* Email Field */}
                    <Grid >
                         <Controller name="email" control={control} rules={{ pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: t('validation:email') } }}
                            render={({ field, fieldState }) => ( <TextField {...field} label={t('suppliers:email')} type="email" variant="outlined" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message || ' '} disabled={isSubmitting} /> )}
                         />
                    </Grid>
                    {/* Phone Field */}
                    <Grid >
                         <Controller name="phone" control={control}
                            render={({ field, fieldState }) => ( <TextField {...field} label={t('suppliers:phone')} type="tel" variant="outlined" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message || ' '} disabled={isSubmitting} /> )}
                         />
                    </Grid>
                    {/* Address Field */}
                    <Grid item xs={12}>
                         <Controller name="address" control={control}
                            render={({ field, fieldState }) => ( <TextField {...field} label={t('suppliers:address')} variant="outlined" fullWidth multiline rows={3} error={!!fieldState.error} helperText={fieldState.error?.message || ' '} disabled={isSubmitting} /> )}
                         />
                    </Grid>
                    {/* Add other fields (website, notes) here if needed */}
                </Grid>
            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Button onClick={handleClose} color="inherit" disabled={isSubmitting} sx={{ color: 'text.secondary' }}>{t('common:cancel')}</Button>
                <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}>{t('common:save')}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SupplierFormModal;