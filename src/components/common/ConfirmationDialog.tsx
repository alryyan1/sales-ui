// src/components/common/ConfirmationDialog.tsx
import React from "react";

// MUI components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          color:
            confirmVariant === "destructive" ? "error.main" : "text.primary",
        }}
      >
        {confirmVariant === "destructive" && <AlertTriangle size={24} />}
        <Typography variant="h6" component="span" fontWeight="bold">
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          variant="outlined"
          color="inherit"
        >
          {cancelText || "إلغاء"}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isLoading}
          variant="contained"
          color={confirmVariant === "destructive" ? "error" : "primary"}
          autoFocus
          startIcon={
            isLoading ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {confirmText || "تأكيد"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
