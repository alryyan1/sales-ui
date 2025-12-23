// src/components/pos/ThermalInvoiceDialog.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  IconButton,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";

// Types
import { Sale } from "./types";
import apiClient from "../../lib/axios";

interface ThermalInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const ThermalInvoiceDialog: React.FC<ThermalInvoiceDialogProps> = ({
  open,
  onClose,
  sale,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && sale) {
      loadThermalInvoice();
    } else {
      setPdfUrl(null);
      setError(null);
    }
  }, [open, sale]);

  const loadThermalInvoice = async () => {
    if (!sale) return;

    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/sales/${sale.id}/thermal-invoice-pdf`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Failed to load thermal invoice:', err);
      setError('فشل في تحميل الفاتورة الحرارية');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl && sale) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `thermal-invoice-${sale.sale_order_number || sale.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: '300px',
          height: '90vh',
          maxHeight: '90vh',
          maxWidth: '300px',
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            معاينة الفاتورة الحرارية - {sale?.sale_order_number || sale?.id}
          </Typography>
          <IconButton onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
        {loading && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress />
            <Typography>جاري التحميل</Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">
              {error}
            </Alert>
          </Box>
        )}

        {pdfUrl && !loading && (
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <iframe
              src={pdfUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                flex: 1
              }}
              title="Thermal Invoice PDF"
            />
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose}>
          إغلاق
        </Button>
        {pdfUrl && (
          <>
            <Button
              variant="outlined"
              onClick={handleDownload}
              startIcon={<DownloadIcon />}
            >
              تنزيل
            </Button>
            <Button
              variant="contained"
              onClick={handlePrint}
              startIcon={<PrintIcon />}
            >
              طباعة
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}; 