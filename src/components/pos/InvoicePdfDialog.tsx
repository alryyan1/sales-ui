// src/components/pos/InvoicePdfDialog.tsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material";

// MUI Icons
import {
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

// Services
import apiClient from "../../lib/axios";

// Types
import { Sale } from "./types";

interface InvoicePdfDialogProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const InvoicePdfDialog: React.FC<InvoicePdfDialogProps> = ({ 
  open, 
  onClose, 
  sale 
}) => {
  const { t } = useTranslation(['pos', 'common']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateInvoicePdf = async () => {
    if (!sale) return;

    setLoading(true);
    setError(null);

    try {
      // Call the backend API to generate invoice PDF
      const response = await apiClient.get(`/sales/${sale.id}/invoice-pdf`, {
        responseType: 'blob',
      });

      // Create blob URL and open in new tab
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.click();
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      // Close dialog on success
      onClose();
    } catch (err) {
      console.error('Failed to generate invoice PDF:', err);
      setError(t('pos:invoicePdfGenerationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewInvoice = async () => {
    // For now, preview is the same as generate
    // In the future, this could open a preview modal
    await handleGenerateInvoicePdf();
  };

  if (!sale) {
    return null;
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6">
            {t('pos:generateInvoicePdf')}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Sale Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            {t('pos:saleInformation')}
          </Typography>
          <Box sx={{ 
            p: 2, 
            bgcolor: 'grey.50', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('pos:invoiceNumber')}:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {sale.invoice_number || t('pos:notAssigned')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('pos:client')}:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {sale.client_name || t('pos:noClient')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('pos:totalAmount')}:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {sale.total_amount.toFixed(2)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">
                {t('pos:itemsCount')}:
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {sale.items.length} {t('pos:items')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Invoice Preview */}
        <Box sx={{ 
          p: 2, 
          bgcolor: 'primary.50', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.200'
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
            {t('pos:invoicePreview')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('pos:invoicePreviewText')}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip 
              label={t('pos:professionalInvoice')} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
        >
          {t('common:cancel')}
        </Button>
        
        <Button
          onClick={handlePreviewInvoice}
          variant="outlined"
          startIcon={<PdfIcon />}
          disabled={loading}
        >
          {t('pos:preview')}
        </Button>
        
        <Button
          onClick={handleGenerateInvoicePdf}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <ReceiptIcon />}
          disabled={loading}
          color="primary"
        >
          {loading ? t('pos:generating') : t('pos:generateInvoice')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 