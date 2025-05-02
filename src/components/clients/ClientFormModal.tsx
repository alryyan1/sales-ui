// src/components/clients/ClientFormModal.tsx
import React, { useEffect, useState } from 'react'; // Import useState for serverError
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

// MUI Components
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
import CloseIcon from '@mui/icons-material/Close'; // MUI Close Icon

// Services and Types
import clientService, { Client, ClientFormData } from '../../services/clientService'; // Adjust path as needed

// Props definition
interface ClientFormModalProps {
    isOpen: boolean; // Changed from 'open' to 'isOpen' for clarity if preferred
    onClose: () => void;
    clientToEdit: Client | null;
    onSaveSuccess: () => void;
}

// Type for validation errors (can be more specific if needed)
interface ClientValidationErrors {
    name?: string[];
    email?: string[];
    phone?: string[];
    address?: string[];
    [key: string]: string[] | undefined; // Index signature for flexibility
}

const ClientFormModal: React.FC<ClientFormModalProps> = ({
    isOpen,
    onClose,
    clientToEdit,
    onSaveSuccess
}) => {
    const { t } = useTranslation(['clients', 'common', 'validation']);
    const isEditMode = Boolean(clientToEdit);

    // --- React Hook Form Setup ---
    const {
        handleSubmit,
        reset,
        control,
        formState: { errors, isSubmitting },
        setError, // <-- Get setError to manually set errors from API
    } = useForm<ClientFormData>({
        defaultValues: {
            name: '', email: '', phone: '', address: '',
        },
        // resolver: zodResolver(clientSchema), // Optional: Add schema validation
    });

    // --- State for general API errors ---
    const [serverError, setServerError] = useState<string | null>(null);

    // --- Effect to Populate/Reset Form ---
    useEffect(() => {
        // Only reset if the modal is actually open
        if (isOpen) {
            if (isEditMode && clientToEdit) {
                reset({ // Populate with existing data
                    name: clientToEdit.name || '',
                    email: clientToEdit.email || '',
                    phone: clientToEdit.phone || '',
                    address: clientToEdit.address || '',
                });
            } else {
                reset(); // Reset to default values for adding
            }
            // Clear previous server errors when modal opens/mode changes
            setServerError(null);
        }
    }, [isOpen, isEditMode, clientToEdit, reset]); // Dependencies


    // --- Submission Handler ---
    const onSubmit: SubmitHandler<ClientFormData> = async (data) => {
        setServerError(null); // Clear previous server error

        // Prepare data (handle nulls for empty strings if backend expects null)
        const dataToSend: Partial<ClientFormData> = {};
        Object.entries(data).forEach(([key, value]) => {
             dataToSend[key as keyof ClientFormData] = value === '' ? null : value;
         });

        try {
            if (isEditMode && clientToEdit) {
                console.log('Updating client:', clientToEdit.id, dataToSend);
                await clientService.updateClient(clientToEdit.id, dataToSend);
            } else {
                console.log('Creating client:', dataToSend);
                await clientService.createClient(dataToSend as ClientFormData);
            }
            onSaveSuccess(); // Call parent callback on success
        } catch (err) {
            console.error("Failed to save client (RHF+MUI):", err);
            const apiErrors = clientService.getValidationErrors(err);
            const generalError = clientService.getErrorMessage(err);

            if (apiErrors) {
                // Option 1: Display combined validation errors in the general alert
                 const errorMessages = Object.values(apiErrors).flat().join('. ');
                 setServerError(`${t('validation:checkFields') || 'Please check the fields below.'} ${errorMessages}`); // Add prefix

                 // Option 2: Manually set errors for each field in RHF state
                 Object.entries(apiErrors).forEach(([field, messages]) => {
                     // Ensure the field name exists in ClientFormData before setting error
                     if (field in ({} as ClientFormData)) { // Basic check
                         setError(field as keyof ClientFormData, {
                            type: 'server',
                            message: messages[0] // Show first error message from server
                         });
                     } else {
                        console.warn(`API returned error for unknown field: ${field}`);
                     }
                 });
                 // You might still want a general error message even if setting field errors
                 // setServerError(t('validation:checkFields') || 'Please check the fields below.');

            } else {
                // Show general non-validation error
                setServerError(generalError);
            }
        }
         // isSubmitting is automatically handled by RHF
    };

    // --- Safe Close Handler ---
    const handleClose = () => {
        if (!isSubmitting) { // Prevent closing while submitting
            onClose();
        }
    };

    // --- Render Modal ---
    // Don't render if not open (improves performance slightly)
    if (!isOpen) {
        return null;
    }

    return (
        <Dialog
            open={isOpen} // Use the prop directly
            onClose={handleClose} // Use the safe close handler
            fullWidth
            maxWidth="sm"
            disableEscapeKey={isSubmitting} // Prevent closing with ESC key during submission
            // Styling using sx prop
            sx={{ '& .MuiDialog-paper': { borderRadius: '8px' } }} // Example: rounded corners via sx
        >
            <DialogTitle sx={{ py: 2, px: 3 }} className="flex justify-between items-center"> {/* Use sx/tailwind */}
                {isEditMode ? t('clients:editClient') : t('clients:addClient')}
                <IconButton aria-label="close" onClick={handleClose} disabled={isSubmitting} sx={{p: 1}}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            {/* Form element is crucial for RHF's handleSubmit */}
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <DialogContent dividers sx={{ px: 3, py: 2 }}> {/* MUI standard padding + dividers */}

                    {/* General Server Error Alert */}
                    {serverError && (
                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setServerError(null)}> {/* Optional close button on alert */}
                            {serverError}
                        </Alert>
                    )}

                    <Grid container gap={2}> {/* MUI Grid for consistent spacing */}

                        {/* Name Field */}
                        <Grid item xs={12} >
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: t('validation:required') || true }}
                                render={({ field, fieldState: { error } }) => (
                                    <TextField
                                        {...field}
                                        autoFocus={!isEditMode} // Autofocus only when adding
                                        margin="dense"
                                        label={`${t('clients:name')} *`} // Add asterisk via label
                                        type="text"
                                        fullWidth
                                        variant="outlined"
                                        error={!!error || !!(errors as ClientValidationErrors)?.name} // Check RHF and manual errors
                                        helperText={error?.message || (errors as ClientValidationErrors)?.name?.[0] || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Email Field */}
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="email"
                                control={control}
                                rules={{
                                    pattern: { // Example RHF email pattern validation
                                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                        message: t('validation:email') || 'Invalid email address'
                                    }
                                }}
                                render={({ field, fieldState: { error } }) => (
                                     <TextField
                                        {...field}
                                        margin="dense"
                                        label={t('clients:email')}
                                        type="email"
                                        fullWidth
                                        variant="outlined"
                                        error={!!error || !!(errors as ClientValidationErrors)?.email}
                                        helperText={error?.message || (errors as ClientValidationErrors)?.email?.[0] || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                             />
                        </Grid>

                        {/* Phone Field */}
                        <Grid item xs={12} sm={6}>
                             <Controller
                                name="phone"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                     <TextField
                                        {...field}
                                        margin="dense"
                                        label={t('clients:phone')}
                                        type="tel"
                                        fullWidth
                                        variant="outlined"
                                        error={!!error || !!(errors as ClientValidationErrors)?.phone}
                                        helperText={error?.message || (errors as ClientValidationErrors)?.phone?.[0] || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                             />
                        </Grid>

                        {/* Address Field */}
                        <Grid item xs={12}>
                            <Controller
                                name="address"
                                control={control}
                                render={({ field, fieldState: { error } }) => (
                                     <TextField
                                        {...field}
                                        margin="dense"
                                        label={t('clients:address')}
                                        type="text"
                                        fullWidth
                                        variant="outlined"
                                        multiline
                                        rows={3}
                                        error={!!error || !!(errors as ClientValidationErrors)?.address}
                                        helperText={error?.message || (errors as ClientValidationErrors)?.address?.[0] || ' '}
                                        disabled={isSubmitting}
                                    />
                                )}
                             />
                        </Grid>

                    </Grid>
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2, pt: 2 }} className="gap-2"> {/* Adjust padding/gap */}
                    <Button
                        onClick={handleClose}
                        // variant="outlined" // Different style for cancel
                        color="inherit" // Use inherit or secondary
                        disabled={isSubmitting}
                        className="dark:text-gray-300 dark:border-gray-500 dark:hover:bg-gray-700" // Example dark mode tailwind
                    >
                        {t('common:cancel')}
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {t('common:save')}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ClientFormModal;