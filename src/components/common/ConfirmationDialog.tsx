// src/components/common/ConfirmationDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import CircularProgress from '@mui/material/CircularProgress';

interface ConfirmationDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string; // Optional custom confirm button text
    cancelText?: string;  // Optional custom cancel button text
    isLoading?: boolean; // Optional loading state for confirm button
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    isLoading = false,
}) => {
    const { t } = useTranslation('common'); // Use common namespace

    const handleConfirm = () => {
        if (!isLoading) {
            onConfirm();
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            onClose();
        }
    };


    return (
        <Dialog
            open={open}
            onClose={handleClose} // Use safe close handler
            disableEscapeKey={isLoading}
            aria-labelledby="confirmation-dialog-title"
            aria-describedby="confirmation-dialog-description"
        >
            <DialogTitle id="confirmation-dialog-title">{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id="confirmation-dialog-description">
                    {message}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} color="inherit" disabled={isLoading}>
                    {cancelText || t('cancel')}
                </Button>
                <Button
                    onClick={handleConfirm}
                    color="primary" // Or "error" depending on context (e.g., delete)
                    variant="contained"
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
                    autoFocus // Focus the confirm button
                >
                    {confirmText || t('confirm')} {/* Add 'confirm' key to common.json */}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;