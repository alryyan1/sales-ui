import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";
import apiClient from "@/lib/axios";

interface BarcodeLabelPdfDialogProps {
  open: boolean;
  onClose: () => void;
  product: { id: number; name: string; sku: string | null } | null;
}

const BarcodeLabelPdfDialog: React.FC<BarcodeLabelPdfDialogProps> = ({
  open,
  onClose,
  product,
}) => {
  const [labelWidthMm, setLabelWidthMm]   = useState(60);
  const [labelHeightMm, setLabelHeightMm] = useState(30);
  const [copies, setCopies]               = useState(1);
  const [pdfUrl, setPdfUrl]               = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  // Revoke previous object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open || !product) {
      setPdfUrl(null);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const fetchPdf = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.get(
          `/products/${product.id}/barcode-label-pdf`,
          {
            params: { width: labelWidthMm, height: labelHeightMm, copies },
            responseType: "blob",
            signal: controller.signal,
          },
        );

        const blob = new Blob([response.data], { type: "application/pdf" });
        const url  = URL.createObjectURL(blob);

        // Revoke old URL
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;
        setPdfUrl(url);
      } catch (err: any) {
        if (err.name !== "CanceledError") {
          setError("فشل توليد الباركود. تأكد من وجود SKU صالح للمنتج.");
        }
      } finally {
        setLoading(false);
      }
    };

    // Debounce 400 ms so rapid slider changes don't spam the server
    const t = setTimeout(fetchPdf, 400);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [open, product, labelWidthMm, labelHeightMm, copies]);

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          طباعة باركود: {product.name}
        </Typography>

        <Stack direction="row" gap={2} mt={1.5} flexWrap="wrap">
          <TextField
            label="العرض (mm)"
            type="number"
            size="small"
            value={labelWidthMm}
            onChange={(e) => setLabelWidthMm(Math.max(20, Math.min(200, Number(e.target.value))))}
            inputProps={{ min: 20, max: 200, step: 1 }}
            sx={{ width: 120 }}
          />
          <TextField
            label="الارتفاع (mm)"
            type="number"
            size="small"
            value={labelHeightMm}
            onChange={(e) => setLabelHeightMm(Math.max(10, Math.min(200, Number(e.target.value))))}
            inputProps={{ min: 10, max: 200, step: 1 }}
            sx={{ width: 120 }}
          />
          <TextField
            label="عدد النسخ"
            type="number"
            size="small"
            value={copies}
            onChange={(e) => setCopies(Math.max(1, Math.min(100, Number(e.target.value))))}
            inputProps={{ min: 1, max: 100, step: 1 }}
            sx={{ width: 110 }}
          />
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ height: "65vh", p: 0, position: "relative" }}>
        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="warning">{error}</Alert>
          </Box>
        )}

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!loading && !error && pdfUrl && (
          <iframe
            src={pdfUrl}
            width="100%"
            height="100%"
            style={{ border: "none", display: "block" }}
            title="barcode-label"
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeLabelPdfDialog;
