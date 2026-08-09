import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { toast } from "sonner";
import apiClient from "@/lib/axios";
import saleReminderService, { DueReminder } from "@/services/saleReminderService";
import { useTranslation } from "react-i18next";

interface Props {
  open: boolean;
  reminders: DueReminder[];
  onDismiss: (id: number) => void;
  onClose: () => void;
}

export const DueRemindersDialog: React.FC<Props> = ({ open, reminders, onDismiss, onClose }) => {
  const { t } = useTranslation(["pos"]);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [dismissingId, setDismissingId] = useState<number | null>(null);

  const handleSendWhatsApp = async (reminder: DueReminder) => {
    const phone = reminder.sale?.client?.phone;
    if (!phone) {
      toast.error(t("pos:dueRemindersDialog.noClientPhone"));
      return;
    }
    setSendingId(reminder.id);
    try {
      const clientName = reminder.sale?.client?.name ?? t("pos:dueRemindersDialog.defaultClientName");

      await apiClient.post("/admin/whatsapp-cloud/send-template", {
        to: phone,
        template_name: "pay_notification",
        language_code: "ar",
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: clientName },
            ],
          },
        ],
      });
      toast.success(t("pos:dueRemindersDialog.whatsappSent"));
    } catch {
      toast.error(t("pos:dueRemindersDialog.whatsappSendFailed"));
    } finally {
      setSendingId(null);
    }
  };

  const handleDismiss = async (reminder: DueReminder) => {
    setDismissingId(reminder.id);
    try {
      await saleReminderService.dismissReminder(reminder.id);
      onDismiss(reminder.id);
    } catch {
      toast.error(t("pos:dueRemindersDialog.dismissFailed"));
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "warning.main",
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} color="white" sx={{ flex: 1 }}>
          {t("pos:dueRemindersDialog.title")}
        </Typography>
        <IconButton size="small" onClick={onClose} sx={{ color: "white" }}>
          <X size={16} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
    
        <Divider />
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t("pos:dueRemindersDialog.client")}</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">{t("pos:dueRemindersDialog.remainingAmount")}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{t("pos:dueRemindersDialog.reminderDate")}</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">{t("pos:dueRemindersDialog.actions")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reminders.map((reminder) => (
              <TableRow key={reminder.id} hover>
                <TableCell sx={{ fontSize: "0.82rem" }}>{reminder.sale_id}</TableCell>
                <TableCell sx={{ fontSize: "0.82rem" }}>
                  {reminder.sale?.client?.name ?? "—"}
                  {reminder.sale?.client?.phone && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      {reminder.sale.client.phone}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right" dir="ltr" sx={{ fontWeight: 700, color: "error.main", fontSize: "0.85rem" }}>
                  {reminder.sale.due_amount.toLocaleString()}
                </TableCell>
                <TableCell sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                  {reminder.remind_at}
                </TableCell>
                <TableCell align="center">
                  <Stack direction="row" gap={0.5} justifyContent="center">
                    <Tooltip title={t("pos:dueRemindersDialog.sendWhatsAppTooltip")}>
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          disabled={sendingId !== null || !reminder.sale?.client?.phone}
                          onClick={() => handleSendWhatsApp(reminder)}
                          startIcon={
                            sendingId === reminder.id
                              ? <CircularProgress size={13} color="inherit" />
                              : <WhatsAppIcon sx={{ fontSize: 15 }} />
                          }
                          sx={{ textTransform: "none", fontSize: "0.75rem", "& .MuiButton-startIcon": { ml: "4px" } }}
                        >
                          {t("pos:dueRemindersDialog.whatsAppReminderButton")}
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip title={t("pos:dueRemindersDialog.dismissTooltip")}>
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          disabled={dismissingId !== null}
                          onClick={() => handleDismiss(reminder)}
                          startIcon={dismissingId === reminder.id ? <CircularProgress size={13} color="inherit" /> : null}
                          sx={{ textTransform: "none", fontSize: "0.75rem" }}
                        >
                          {t("pos:dueRemindersDialog.dismissButton")}
                        </Button>
                      </span>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
};
