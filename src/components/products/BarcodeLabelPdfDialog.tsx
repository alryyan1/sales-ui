import React, { useState, useEffect } from "react";
import JsBarcode from "jsbarcode";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Box,
  Alert,
  Typography,
  CircularProgress,
} from "@mui/material";
import { PDFViewer } from "@react-pdf/renderer";
import BarcodeLabelPdf from "./BarcodeLabelPdf";

interface BarcodeLabelPdfDialogProps {
  open: boolean;
  onClose: () => void;
  product: { name: string; sku: string | null } | null;
}

const BarcodeLabelPdfDialog: React.FC<BarcodeLabelPdfDialogProps> = ({
  open,
  onClose,
  product,
}) => {
  const [labelWidthMm, setLabelWidthMm] = useState(60);
  const [labelHeightMm, setLabelHeightMm] = useState(30);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [barcodeError, setBarcodeError] = useState(false);

  useEffect(() => {
    if (!open || !product) {
      setBarcodeDataUrl(null);
      setBarcodeError(false);
      return;
    }

    const value = product.sku || product.name;
    if (!value) {
      setBarcodeError(true);
      setBarcodeDataUrl(null);
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, value, {
        format: "CODE128",
        width: 2,
        height: 80,
        displayValue: false,
        margin: 4,
      });
      setBarcodeDataUrl(canvas.toDataURL("image/png"));
      setBarcodeError(false);
    } catch {
      setBarcodeError(true);
      setBarcodeDataUrl(null);
    }
  }, [open, product, labelWidthMm, labelHeightMm]);

  if (!product) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={600}>
          طباعة باركود: {product.name}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mt: 1.5 }}>
          <TextField
            label="العرض (mm)"
            type="number"
            size="small"
            value={labelWidthMm}
            onChange={(e) => {
              const v = Math.max(20, Math.min(200, Number(e.target.value)));
              setLabelWidthMm(v);
            }}
            inputProps={{ min: 20, max: 200, step: 1 }}
            sx={{ width: 130 }}
          />
          <TextField
            label="الارتفاع (mm)"
            type="number"
            size="small"
            value={labelHeightMm}
            onChange={(e) => {
              const v = Math.max(15, Math.min(150, Number(e.target.value)));
              setLabelHeightMm(v);
            }}
            inputProps={{ min: 15, max: 150, step: 1 }}
            sx={{ width: 130 }}
          />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ height: "65vh", p: 0 }}>
        {barcodeError && (
          <Box sx={{ p: 2 }}>
            <Alert severity="warning">
              لا يمكن توليد باركود لهذا المنتج — تأكد من وجود SKU صالح.
            </Alert>
          </Box>
        )}

        {!barcodeError && !barcodeDataUrl && (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {!barcodeError && barcodeDataUrl && (
          <PDFViewer width="100%" height="100%" showToolbar>
            <BarcodeLabelPdf
              product={product}
              barcodeDataUrl={barcodeDataUrl}
              labelWidthMm={labelWidthMm}
              labelHeightMm={labelHeightMm}
            />
          </PDFViewer>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeLabelPdfDialog;
