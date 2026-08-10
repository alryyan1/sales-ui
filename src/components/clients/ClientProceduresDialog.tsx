import React from "react";
import { useTranslation } from "react-i18next";
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
  companyName: companyNameProp,
}) => {
  const { t } = useTranslation("clients");
  const companyName = companyNameProp ?? t("companyNameDefault");
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
          {t("clientActionsTitle")}
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
              <Box sx={{ textAlign: "start" }}>
                <Typography
                  variant="button"
                  display="block"
                  sx={{ lineHeight: 1.2 }}
                >
                  {t("editDataShort")}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "none" }}
                >
                  {t("updateClientInfoDesc")}
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
              <Box sx={{ textAlign: "start" }}>
                <Typography
                  variant="button"
                  display="block"
                  sx={{ lineHeight: 1.2 }}
                >
                  {t("ledger")}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "none" }}
                >
                  {t("viewTransactionDetails")}
                </Typography>
              </Box>
            </Button>
          </div>

     

       
      </DialogContent>
    </Dialog>
  );
};

export default ClientProceduresDialog;
