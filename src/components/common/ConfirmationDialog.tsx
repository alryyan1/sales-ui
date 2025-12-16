// src/components/common/ConfirmationDialog.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';

// MUI components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    isLoading?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    open,
    onOpenChange,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    confirmVariant = "destructive",
    isLoading = false,
}) => {
    const { t } = useTranslation('common');

    const handleClose = () => {
        if (isLoading) return;
        if (onOpenChange) {
            onOpenChange(false);
        }
        onClose();
    };

    const handleConfirm = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!isLoading) {
            onConfirm();
        }
    };

    const handleCancel = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!isLoading) {
            handleClose();
        }
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle
                sx={{
                    pb: 1.5,
                    pt: 3,
                    px: 3,
                    borderBottom: 1,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                }}
            >
                {confirmVariant === 'destructive' && (
                    <AlertTriangle className="h-5 w-5" style={{ color: "var(--mui-palette-error-main)" }} />
                )}
                <Typography variant="h6" component="div" fontWeight={600}>
                    {title}
                </Typography>
            </DialogTitle>
            <DialogContent
                sx={{
                    pt: 3,
                    px: 3,
                    pb: 2,
                }}
            >
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {message}
                </Typography>
            </DialogContent>
            <DialogActions
                sx={{
                    px: 3,
                    pb: 3,
                    pt: 2,
                    borderTop: 1,
                    borderColor: "divider",
                }}
            >
                <Button
                    type="button"
                    onClick={handleCancel}
                    variant="outlined"
                    color="inherit"
                    disabled={isLoading}
                    sx={{ minWidth: 100 }}
                >
                    {cancelText || t('cancel')}
                </Button>
                <Button
                    type="button"
                    onClick={handleConfirm}
                    variant={confirmVariant === "destructive" ? "contained" : "contained"}
                    color={confirmVariant === "destructive" ? "error" : "primary"}
                    disabled={isLoading}
                    sx={{ minWidth: 100 }}
                    startIcon={
                        isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : undefined
                    }
                >
                    {confirmText || t('confirm')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmationDialog;
