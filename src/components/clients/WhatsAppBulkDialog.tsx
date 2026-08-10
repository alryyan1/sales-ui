// src/components/clients/WhatsAppBulkDialog.tsx
import React, { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";

import {
  WhatsApp,
  CheckCircle,
  ErrorOutline,
  HourglassEmpty,
  StopCircleOutlined,
  PlayArrowOutlined,
  PhoneDisabled,
} from "@mui/icons-material";

import { Client } from "../../services/clientService";
import whatsappService from "../../services/whatsappService.tsx";
import { useLanguage } from "@/context/LanguageContext";

// ── Types ──────────────────────────────────────────────────────────────────
type SendStatus = "pending" | "sending" | "success" | "failed";

interface ClientSendState {
  client: Client;
  status: SendStatus;
  error?: string;
}

interface WhatsAppBulkDialogProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  templateName?: string;
  languageCode?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const StatusIcon: React.FC<{ status: SendStatus }> = ({ status }) => {
  if (status === "sending") return <CircularProgress size={16} thickness={5} />;
  if (status === "success") return <CheckCircle sx={{ fontSize: 18, color: "success.main" }} />;
  if (status === "failed") return <ErrorOutline sx={{ fontSize: 18, color: "error.main" }} />;
  return <HourglassEmpty sx={{ fontSize: 16, color: "text.disabled" }} />;
};

// ── Component ──────────────────────────────────────────────────────────────
const WhatsAppBulkDialog: React.FC<WhatsAppBulkDialogProps> = ({
  open,
  onClose,
  clients,
  templateName = "pay_notification",
  languageCode = "ar",
}) => {
  const { direction } = useLanguage();
  const { t } = useTranslation("clients");
  const { t: tCommon } = useTranslation("common");
  const [states, setStates] = useState<ClientSendState[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(10);
  const [countdown, setCountdown] = useState<number | null>(null);

  const cancelRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset when dialog opens with new clients
  React.useEffect(() => {
    if (open) {
      setStates(clients.map((c) => ({ client: c, status: "pending" })));
      setIsSending(false);
      setIsFinished(false);
      setCountdown(null);
      cancelRef.current = false;
    }
  }, [open, clients]);

  const updateState = useCallback(
    (index: number, status: SendStatus, error?: string) => {
      setStates((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status, error };
        return next;
      });
    },
    [],
  );

  // Scroll the active row into view
  const scrollToRow = (index: number) => {
    const el = listRef.current?.querySelector(`[data-row="${index}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const startSending = async () => {
    cancelRef.current = false;
    setIsSending(true);
    setIsFinished(false);

    for (let i = 0; i < clients.length; i++) {
      if (cancelRef.current) break;

      updateState(i, "sending");
      scrollToRow(i);

      const client = clients[i];

      if (!client.phone) {
        updateState(i, "failed", t("noPhoneNumber"));
      } else {
        const result = await whatsappService.sendTemplate(
          client.phone,
          templateName,
          languageCode,
          [{ type: "body", parameters: [{ type: "text", text: client.name }] }],
        );
        updateState(i, result.success ? "success" : "failed", result.error);
      }

      // Delay between sends (skip after last)
      if (i < clients.length - 1 && !cancelRef.current) {
        for (let s = delaySeconds; s > 0; s--) {
          if (cancelRef.current) break;
          setCountdown(s);
          await sleep(1000);
        }
        setCountdown(null);
      }
    }

    setCountdown(null);
    setIsSending(false);
    setIsFinished(true);
  };

  const stopSending = () => {
    cancelRef.current = true;
    setCountdown(null);
  };

  // ── Derived counts ──
  const total = states.length;
  const doneCount = states.filter((s) => s.status === "success").length;
  const failedCount = states.filter((s) => s.status === "failed").length;
  const pendingCount = states.filter((s) => s.status === "pending").length;
  const processed = doneCount + failedCount;
  const progress = total > 0 ? (processed / total) * 100 : 0;

  const sendingIndex = states.findIndex((s) => s.status === "sending");

  return (
    <Dialog
      open={open}
      onClose={() => !isSending && onClose()}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
      dir={direction}
    >
      {/* ── Header ── */}
      <DialogTitle sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.5, px: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 34, height: 34, borderRadius: "50%",
              bgcolor: "#25D366", color: "white", flexShrink: 0,
            }}
          >
            <WhatsApp sx={{ fontSize: 18 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              {t("sendWhatsappNotification")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("templateLabel")} <strong>{templateName}</strong> · {t("languageLabel")} {languageCode}
            </Typography>
          </Box>
          <Chip label={t("clientsCountChip", { count: total })} size="small" color="primary" variant="outlined" />
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {/* ── Settings row ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pt: 0.5 }}>
          <TextField
            label={t("delayBetweenSendsLabel")}
            type="number"
            size="small"
            value={delaySeconds}
            onChange={(e) => setDelaySeconds(Math.max(1, Math.min(60, Number(e.target.value))))}
            inputProps={{ min: 1, max: 60 }}
            disabled={isSending}
            sx={{ width: 200 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {countdown !== null && isSending && (
              <span>{t("nextInLabel")} <strong>{countdown}s</strong>...</span>
            )}
          </Typography>
        </Box>

        {/* ── Progress bar ── */}
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {processed} / {total}
            </Typography>
            <Box sx={{ display: "flex", gap: 0.75 }}>
              {doneCount > 0 && (
                <Chip icon={<CheckCircle sx={{ fontSize: "14px !important" }} />} label={doneCount} size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
              {failedCount > 0 && (
                <Chip icon={<ErrorOutline sx={{ fontSize: "14px !important" }} />} label={failedCount} size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
              {pendingCount > 0 && (
                <Chip icon={<HourglassEmpty sx={{ fontSize: "14px !important" }} />} label={pendingCount} size="small" color="default" variant="outlined" sx={{ height: 20, fontSize: "0.7rem" }} />
              )}
            </Box>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 3 }}
            color={isFinished && failedCount > 0 ? "warning" : "primary"}
          />
        </Box>

        <Divider />

        {/* ── Client list ── */}
        <Box
          ref={listRef}
          sx={{ maxHeight: 340, overflowY: "auto", display: "flex", flexDirection: "column", gap: 0.5 }}
        >
          {states.map((s, i) => {
            const isCurrent = s.status === "sending";
            const noPhone = !s.client.phone;
            return (
              <Box
                key={s.client.id}
                data-row={i}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: isCurrent ? "primary.main" : "divider",
                  bgcolor: isCurrent ? "primary.50" : s.status === "success" ? "success.50" : s.status === "failed" ? "error.50" : "grey.50",
                  transition: "all 0.2s",
                }}
              >
                {/* Status icon */}
                <Box sx={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <StatusIcon status={s.status} />
                </Box>

                {/* Name + phone */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={isCurrent ? 700 : 500} noWrap>
                    {s.client.name}
                  </Typography>
                  {s.client.phone ? (
                    <Typography variant="caption" color="text.secondary" dir="ltr">
                      {s.client.phone}
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <PhoneDisabled sx={{ fontSize: 11, color: "text.disabled" }} />
                      <Typography variant="caption" color="text.disabled">{t("noNumberShort")}</Typography>
                    </Box>
                  )}
                </Box>

                {/* Error message */}
                {s.error && (
                  <Tooltip title={s.error} placement="right">
                    <Typography variant="caption" color="error.main" sx={{ maxWidth: 120, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", cursor: "default" }}>
                      {s.error}
                    </Typography>
                  </Tooltip>
                )}

                {/* Countdown badge on current row */}
                {isCurrent && countdown !== null && (
                  <Chip label={`${countdown}s`} size="small" color="primary" sx={{ height: 18, fontSize: "0.65rem", minWidth: 32 }} />
                )}
              </Box>
            );
          })}
        </Box>

        {isFinished && (
          <Box sx={{ textAlign: "center", py: 0.5 }}>
            <Typography variant="body2" color={failedCount === 0 ? "success.main" : "warning.main"} fontWeight={600}>
              {failedCount === 0
                ? t("allMessagesSentSuccess")
                : t("sendingCompletedSummary", { done: doneCount, failed: failedCount })}
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* ── Footer ── */}
      <DialogActions sx={{ borderTop: "1px solid", borderColor: "divider", px: 2.5, py: 1.5, gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          disabled={isSending}
          size="small"
        >
          {tCommon("close")}
        </Button>

        {isSending ? (
          <Button
            variant="contained"
            color="error"
            size="small"
            startIcon={<StopCircleOutlined />}
            onClick={stopSending}
            sx={{ minWidth: 110 }}
          >
            {t("stopButton")}
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<PlayArrowOutlined />}
            onClick={startSending}
            disabled={isFinished || total === 0}
            sx={{ minWidth: 110, bgcolor: "#25D366", "&:hover": { bgcolor: "#1ebe59" } }}
          >
            {isFinished ? t("completedShort") : t("startSending")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default WhatsAppBulkDialog;
