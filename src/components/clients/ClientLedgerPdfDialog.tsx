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
import { ClientLedgerPdf } from "./ClientLedgerPdf";
import { ClientLedger } from "../../services/clientLedgerService";
import { useSettings } from "@/context/SettingsContext";

interface ClientLedgerPdfDialogProps {
  open: boolean;
  onClose: () => void;
  ledger: ClientLedger | null;
}

export const ClientLedgerPdfDialog: React.FC<ClientLedgerPdfDialogProps> = ({
  open,
  onClose,
  ledger,
}) => {
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
            <ClientLedgerPdf ledger={ledger} settings={settings} />
          </PDFViewer>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
