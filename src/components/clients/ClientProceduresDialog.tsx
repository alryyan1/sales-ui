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
        {/* Client Summary Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: "grey.50",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: "primary.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mr: 2,
                fontSize: "1.2rem",
                fontWeight: "bold",
              }}
            >
              {client.name.charAt(0)}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {client.name}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  color: "text.secondary",
                  fontSize: "0.875rem",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                >
                  <Phone size={14} /> {client.phone || "---"}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                الرصيد الحالي
              </Typography>
              <Typography
                variant="h6"
                fontWeight="bold"
                color={
                  (client.balance || 0) > 0 ? "error.main" : "success.main"
                }
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Wallet size={18} />
                {(client.balance || 0).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ textAlign: "left" }}>
              <Typography variant="caption" color="text.secondary">
                إجمالي المديونية
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(client.total_debit || 0).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                إجمالي المدفوعات
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {(client.total_credit || 0).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Actions Grid - Using standard div/CSS grid instead of MUI Grid to avoid version conflicts */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          اختر إجراء:
        </Typography>

        <div className="grid grid-cols-2 gap-3 pb-2">
          <div className="col-span-1">
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
          </div>

          <div className="col-span-1">
            <Button
              variant="outlined"
              fullWidth
              startIcon={<ShoppingCart size={18} />}
              onClick={() => {
                if (onNewSale) onNewSale(client.id);
                onClose();
              }}
              sx={{
                height: 60,
                justifyContent: "flex-start",
                borderColor: "divider",
                color: "text.primary",
                "&:hover": {
                  borderColor: "success.main",
                  bgcolor: "success.50",
                },
              }}
            >
              <Box sx={{ textAlign: "right" }}>
                <Typography
                  variant="button"
                  display="block"
                  sx={{ lineHeight: 1.2 }}
                >
                  عملية بيع جديدة
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "none" }}
                >
                  انتقال لنقطة البيع
                </Typography>
              </Box>
            </Button>
          </div>

          <div className="col-span-1">
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

          <div className="col-span-1">
            {/* PDF Generation Logic */}
            {!readyToDownload || !ledger ? (
              <Button
                variant="outlined"
                fullWidth
                startIcon={
                  isGeneratingPdf ? (
                    <CircularProgress size={18} />
                  ) : (
                    <Printer size={18} />
                  )
                }
                onClick={handlePreparePdf}
                disabled={isGeneratingPdf}
                sx={{
                  height: 60,
                  justifyContent: "flex-start",
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": {
                    borderColor: "secondary.main",
                    bgcolor: "secondary.50",
                  },
                }}
              >
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="button"
                    display="block"
                    sx={{ lineHeight: 1.2 }}
                  >
                    تحميل كشف PDF
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: "none" }}
                  >
                    تصدير كملف للطباعة
                  </Typography>
                </Box>
              </Button>
            ) : (
              <PDFDownloadLink
                document={
                  <ClientLedgerPdf ledger={ledger} companyName={companyName} />
                }
                fileName={`ledger_${client.name}_${
                  new Date().toISOString().split("T")[0]
                }.pdf`}
                style={{ textDecoration: "none", width: "100%" }}
              >
                {({ loading }) => (
                  <Button
                    variant="contained"
                    color="secondary"
                    fullWidth
                    startIcon={<Printer size={18} />}
                    sx={{ height: 60, justifyContent: "flex-start" }}
                  >
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="button"
                        display="block"
                        sx={{ lineHeight: 1.2 }}
                      >
                        {loading ? "جاري التحضير..." : "اضغط للتحميل"}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ textTransform: "none", color: "white" }}
                      >
                        تم تجهيز الملف
                      </Typography>
                    </Box>
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>

          <div className="col-span-2">
            <Button
              variant="outlined"
              fullWidth
              color="error"
              startIcon={<Trash2 size={18} />}
              onClick={() => {
                onDelete(client.id);
                onClose();
              }}
              sx={{
                height: 50,
                justifyContent: "flex-start",
                borderColor: "error.light",
                color: "error.main",
                "&:hover": { borderColor: "error.main", bgcolor: "error.50" },
              }}
            >
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="button" display="block">
                  حذف العميل
                </Typography>
              </Box>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientProceduresDialog;
