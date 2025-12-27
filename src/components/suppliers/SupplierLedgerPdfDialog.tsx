import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { X } from "lucide-react";
import { PDFViewer } from "@react-pdf/renderer";
import { SupplierLedgerPdf } from "./SupplierLedgerPdf";
import { SupplierLedger } from "../../services/supplierPaymentService";
import { useSettings } from "@/context/SettingsContext";

interface SupplierLedgerPdfDialogProps {
  open: boolean;
  onClose: () => void;
  ledger: SupplierLedger | null;
}

export const SupplierLedgerPdfDialog: React.FC<
  SupplierLedgerPdfDialogProps
> = ({ open, onClose, ledger }) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { settings } = useSettings();

  if (!ledger) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          height: fullScreen ? "100%" : "90vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          p: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>معاينة كشف الحساب (PDF)</span>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, flex: 1, overflow: "hidden" }}>
        <Box sx={{ width: "100%", height: "100%" }}>
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            <SupplierLedgerPdf ledger={ledger} settings={settings} />
          </PDFViewer>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
