import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  Typography,
  Box,
  Paper,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Edit,
  FileText,
  Printer,
  Trash2,
  ShoppingCart,
  Phone,
  X,
  Wallet,
} from "lucide-react";
import { Client } from "../../services/clientService";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ClientLedgerPdf } from "./ClientLedgerPdf";
import clientLedgerService, {
  ClientLedger,
} from "../../services/clientLedgerService";

interface ClientProceduresDialogProps {
  open: boolean;
  onClose: () => void;
  client: Client | null;
  onEdit: (client: Client) => void;
  onDelete: (id: number) => void;
  onViewLedger: (id: number) => void;
  onNewSale?: (clientId: number) => void; // Optional handler for new sale shortcut
  companyName?: string;
}

const ClientProceduresDialog: React.FC<ClientProceduresDialogProps> = ({
  open,
  onClose,
  client,
  onEdit,
  onDelete,
  onViewLedger,
  onNewSale,
  companyName = "اسم الشركة",
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [ledger, setLedger] = useState<ClientLedger | null>(null);

  // Better approach for "Download PDF": Button that triggers fetch, then renders the download link conditionally.
  const [readyToDownload, setReadyToDownload] = useState(false);

  const handlePreparePdf = async () => {
    if (!client) return;
    setIsGeneratingPdf(true);
    try {
      // Fetch ALL ledger entries for the PDF (not paginated ideally, or set high page size)
      // Function name is 'getLedger' in service, assuming it returns ClientLedger object which has ledger_entries
      const response = await clientLedgerService.getLedger(client.id);
      // The service returns the whole object structure, we need ledger_entries
      setLedger(response);
      setReadyToDownload(true);
    } catch (error) {
      console.error("Failed to fetch ledger for PDF", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, padding: 1 },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          إجراءات العميل
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent>
       


          <div className="col-span-1 flex flex-row gap-2">
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Edit size={18} />}
              onClick={() => {
                onEdit(client);
                onClose();
              }}
              sx={{
                height: 60,
                justifyContent: "flex-start",
                borderColor: "divider",
                color: "text.primary",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "primary.50",
                },
              }}
            >
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  variant="button"
                  display="block"
                  sx={{ lineHeight: 1.2 }}
                >
                  تعديل البيانات
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "none" }}
                >
                  تحديث معلومات العميل
                </Typography>
              </Box>
            </Button>

       
            <Button
              variant="outlined"
              fullWidth
              startIcon={<FileText size={18} />}
              onClick={() => {
                onViewLedger(client.id);
                onClose();
              }}
              sx={{
                height: 60,
                justifyContent: "flex-start",
                borderColor: "divider",
                color: "text.primary",
                "&:hover": { borderColor: "info.main", bgcolor: "info.50" },
              }}
            >
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  variant="button"
                  display="block"
                  sx={{ lineHeight: 1.2 }}
                >
                  كشف حساب
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "none" }}
                >
                  عرض تفاصيل المعاملات
                </Typography>
              </Box>
            </Button>
          </div>

     

       
      </DialogContent>
    </Dialog>
  );
};

export default ClientProceduresDialog;
