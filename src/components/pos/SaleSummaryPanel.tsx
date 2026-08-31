import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  createFilterOptions,
  Divider,
  Chip,
  Popover,
  Tooltip,
  Menu,
} from "@mui/material";
import { Bell } from "lucide-react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import PaymentsIcon from "@mui/icons-material/Payments";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CreateIcon from "@mui/icons-material/Create";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import { Sale, Payment } from "@/services/saleService";
import { Client } from "@/services/clientService";
import { useSettings } from "@/context/SettingsContext";
import { CURRENCY_DECIMALS } from "@/constants";
import { parseActivePaymentMethods } from "@/lib/paymentMethods";
import dayjs from "dayjs";

export interface ClientOptionType extends Partial<Client> {
  inputValue?: string;
}

const filter = createFilterOptions<ClientOptionType>();

interface SaleSummaryPanelProps {
  selectedSale: Sale | null;
  clientOptions: Client[];
  clientInputValue: string;
  setClientInputValue: (val: string) => void;
  setInitialClientName: (val: string) => void;
  setIsClientModalOpen: (open: boolean) => void;
  handleClientChange: (client: Client | null) => void;
  clientSearchLoading: boolean;
  formatNumber: (n: number, decimals?: number) => string;
  discountType: "percentage" | "fixed";
  setDiscountType: (type: "percentage" | "fixed") => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  handleApplyDiscount: () => void;
  discountLoading: boolean;
  handleRemoveDiscount: () => void;
  handleDeletePayment: (id: number) => void;
  deletingPaymentId: number | null;
  newPaymentMethod: Payment["method"];
  setNewPaymentMethod: (method: Payment["method"]) => void;
  newPaymentAmount: string;
  setNewPaymentAmount: (amount: string) => void;
  handleAddPayment: () => void;
  addPaymentLoading: boolean;
  thermalPdfLoading: boolean;
  handlePrintThermalInvoice: () => void;
  a4PdfLoading: boolean;
  handlePrintA4Invoice: (currency: "local" | "usd") => void;
  fullPaymentLoading: boolean;
  handleFullPayment: () => void;
  canPayment?: boolean;
  canCancelPayment?: boolean;
  canDiscount?: boolean;
  handleSaleDateChange: (date: string) => Promise<void>;
  saleDateLoading?: boolean;
  whatsAppLoading: boolean;
  handleSendWhatsApp: () => void;
  reminderDate: string | null;
  onSetReminder: (days: number) => Promise<void>;
  onRemoveReminder: () => Promise<void>;
  reminderLoading: boolean;
}

const METHOD_LABEL_KEYS: Record<string, string> = {
  cash: "paymentMethodCash",
  bankak: "paymentMethodBankak",
  fawry: "paymentMethodFawry",
  ocash: "paymentMethodOcash",
  bank_transfer: "paymentMethodBankTransfer",
  card: "paymentMethodCard",
};

// Tiny labeled row used in the financials block
const FinRow = ({
  label,
  value,
  bold,
  color,
  bg,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
  bg?: string;
}) => (
  <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
    sx={{ px: 1.25, py: 0.5, bgcolor: bg ?? "transparent" }}
  >
    <Typography variant="caption" color={color ?? "text.secondary"} fontWeight={bold ? 700 : 400}>
      {label}
    </Typography>
    <Typography variant="caption" color={color ?? "text.primary"} fontWeight={bold ? 800 : 600}>
      {value}
    </Typography>
  </Stack>
);

export const SaleSummaryPanel: React.FC<SaleSummaryPanelProps> = ({
  selectedSale,
  clientOptions,
  clientInputValue,
  setClientInputValue,
  setInitialClientName,
  setIsClientModalOpen,
  handleClientChange,
  clientSearchLoading,
  formatNumber,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  handleApplyDiscount,
  discountLoading,
  handleRemoveDiscount,
  handleDeletePayment,
  deletingPaymentId,
  newPaymentMethod,
  setNewPaymentMethod,
  newPaymentAmount,
  setNewPaymentAmount,
  handleAddPayment,
  addPaymentLoading,
  thermalPdfLoading,
  handlePrintThermalInvoice,
  a4PdfLoading,
  handlePrintA4Invoice,
  fullPaymentLoading,
  handleFullPayment,
  handleSaleDateChange,
  saleDateLoading,
  whatsAppLoading,
  handleSendWhatsApp,
  reminderDate,
  onSetReminder,
  onRemoveReminder,
  reminderLoading,
  canPayment = true,
  canCancelPayment = true,
  canDiscount = true,
}) => {
  const { t } = useTranslation("pos");
  const { t: tSummary } = useTranslation("saleSummaryPanel");
  const { t: tCommon } = useTranslation("common");
  const { getSetting } = useSettings();
  const activePaymentMethods = parseActivePaymentMethods(getSetting("pos_active_payment_methods"));
  const currencyDecimals =
    CURRENCY_DECIMALS[getSetting("currency_code", "SDG") as string] ?? 0;
  const [dateEditing, setDateEditing] = useState(false);
  const [tempDate, setTempDate] = useState("");
  const [bellAnchor, setBellAnchor] = useState<HTMLButtonElement | null>(null);
  const [daysInput, setDaysInput] = useState("3");
  const [a4MenuAnchor, setA4MenuAnchor] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    setTempDate(selectedSale?.sale_date ?? "");
    setDateEditing(false);
  }, [selectedSale?.id]);

  const activePaymentMethodsKey = activePaymentMethods.join(",");
  useEffect(() => {
    if (activePaymentMethods.length > 0 && !activePaymentMethods.includes(newPaymentMethod)) {
      setNewPaymentMethod(activePaymentMethods[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePaymentMethodsKey, newPaymentMethod]);
  if (!selectedSale) {
    return (
      <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}>
        <Paper
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            borderRadius: 2,
            bgcolor: "grey.50",
            border: "1px dashed",
            borderColor: "grey.300",
          }}
        >
          <ReceiptLongIcon sx={{ fontSize: 32, color: "grey.300" }} />
          <Typography variant="caption" color="text.disabled" fontWeight={500}>
            {tSummary("selectSaleToViewDetails")}
          </Typography>
        </Paper>
      </Box>
    );
  }

  const subtotal =
    selectedSale.subtotal != null
      ? Number(selectedSale.subtotal)
      : (selectedSale.items ?? []).reduce((sum, i) => sum + Number(i.total_price ?? 0), 0);
  const discountAmt = Number(selectedSale.discount_amount ?? 0);
  const total = Number(selectedSale.total_amount ?? 0);
  const paid = Number(selectedSale.paid_amount ?? 0);
  const due =
    selectedSale.due_amount != null
      ? Number(selectedSale.due_amount)
      : Math.max(0, total - paid);
  const isFullyPaid = due <= 0;

  return (
    <Box sx={{ width: { xs: "100%", md: 300 }, flexShrink: 0 }}>
      <Paper
        sx={{
          height: "100%",
          overflow: "auto",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: "grey.200",
        }}
        elevation={0}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            background: "linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)",
            borderRadius: "8px 8px 0 0",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography sx={{ fontSize: "0.8rem" }} fontWeight={700} color="white">
              {tSummary("invoiceHash", { id: selectedSale.id })}
            </Typography>
            <Stack direction="row" alignItems="center" gap={0.5}>
              <Chip
                label={isFullyPaid ? tSummary("paidStatus") : tSummary("unpaidStatus")}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  bgcolor: isFullyPaid ? "success.main" : "warning.main",
                  color: "white",
                }}
              />
              {!isFullyPaid && (
                <Tooltip
                  title={
                    reminderDate
                      ? tSummary("reminderSetForDate", { date: dayjs(reminderDate).format("YYYY-MM-DD") })
                      : tSummary("setPaymentReminder")
                  }
                >
                  <IconButton
                    size="small"
                    onClick={(e) => setBellAnchor(e.currentTarget)}
                    sx={{ p: 0.25, color: reminderDate ? "warning.light" : "rgba(255,255,255,0.5)", "&:hover": { color: "white" } }}
                  >
                    <Bell size={15} fill={reminderDate ? "currentColor" : "none"} />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {/* Bell Popover */}
          <Popover
            open={Boolean(bellAnchor)}
            anchorEl={bellAnchor}
            onClose={() => setBellAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { p: 1.5, width: 200 } } }}
          >
            <Typography variant="caption" fontWeight={700} display="block" mb={1}>
              {tSummary("reminderAfterDays")}
            </Typography>
            <TextField
              size="small"
              type="number"
              fullWidth
              onFocus={(e) => e.target.select()}
              autoFocus
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  await onSetReminder(Number(daysInput));
                  setBellAnchor(null);
                  // Trigger the save action or any other desired behavior
                }
              }}
              value={daysInput}
              onChange={(e) => setDaysInput(e.target.value)}
              slotProps={{ htmlInput: { min: 1, max: 365 } }}
              sx={{ mb: 1 }}
            />
            <Stack direction="row" spacing={0.75}>
              <Button
                size="small"
                variant="contained"
                fullWidth
                disabled={reminderLoading || !daysInput || Number(daysInput) < 1}
                startIcon={reminderLoading ? <CircularProgress size={12} color="inherit" /> : null}
                onClick={async () => {
                  await onSetReminder(Number(daysInput));
                  setBellAnchor(null);
                }}
                sx={{ textTransform: "none", fontSize: "0.75rem" }}
              >
                {tCommon("save")}
              </Button>
              {reminderDate && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  fullWidth
                  disabled={reminderLoading}
                  onClick={async () => {
                    await onRemoveReminder();
                    setBellAnchor(null);
                  }}
                  sx={{ textTransform: "none", fontSize: "0.75rem" }}
                >
                  {tCommon("cancel")}
                </Button>
              )}
            </Stack>
          </Popover>
          <Stack direction="column" mt={0.5} gap={0.3}>
            {selectedSale.warehouse?.name && (
              <Chip
                label={selectedSale.warehouse.name}
                size="small"
                sx={{ alignSelf: "flex-start", height: 16, fontSize: "0.6rem", fontWeight: 600, bgcolor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", border: "none" }}
              />
            )}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" gap={0.4}>
              <PersonOutlineIcon sx={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
              <Typography sx={{ fontSize: "0.68rem" }} color="white">
                {selectedSale.user_name || selectedSale.user?.name || "—"}
              </Typography>
            </Stack>
            <Stack direction="row" alignItems="center" gap={0.3}>
              <CalendarTodayIcon sx={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }} />
              {dateEditing ? (
                <input
                  type="date"
                  value={tempDate}
                  autoFocus
                  disabled={saleDateLoading}
                  onChange={(e) => setTempDate(e.target.value)}
                  onBlur={async () => {
                    if (tempDate && tempDate !== selectedSale.sale_date) {
                      await handleSaleDateChange(tempDate);
                    }
                    setDateEditing(false);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.4)",
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.68rem",
                    outline: "none",
                    colorScheme: "dark",
                    width: 100,
                  }}
                />
              ) : (
                <Typography sx={{ fontSize: "0.68rem" }} color="rgba(255,255,255,0.65)">
                  {selectedSale.sale_date}
                </Typography>
              )}
              {saleDateLoading
                ? <CircularProgress size={10} sx={{ color: "rgba(255,255,255,0.5)" }} />
                : (
                  <IconButton size="small" onClick={() => setDateEditing(true)}
                    sx={{ p: 0, color: "rgba(255,255,255,0.35)", "&:hover": { color: "rgba(255,255,255,0.8)" } }}>
                    <CreateIcon sx={{ fontSize: 11 }} />
                  </IconButton>
                )}
            </Stack>
          </Stack>
          </Stack>
          {selectedSale.created_at && (
            <Stack direction="row" alignItems="center" gap={0.4} mt={0.3}>
              <AccessTimeIcon sx={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }} />
              <Typography sx={{ fontSize: "0.63rem" }} color="rgba(255,255,255,0.45)">
                {dayjs(selectedSale.created_at.replace("Z", "")).format("YYYY-MM-DD HH:mm")}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ px: 1.5, py: 1, display: "flex", flexDirection: "column", gap: 1, flex: 1 }}>

          {/* ── Client ── */}
          <Autocomplete
            size="small"
            options={clientOptions as ClientOptionType[]}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;
              if (option.inputValue) return option.inputValue;
              return option.name || "";
            }}
            filterOptions={(options, params) => {
              const filtered = filter(options, params);
              const { inputValue } = params;
              const isExisting = options.some((o) => inputValue === o.name);
              if (inputValue !== "" && !isExisting) {
                filtered.push({ inputValue, name: tSummary("addClientOption", { value: inputValue }) });
              }
              return filtered;
            }}
            inputValue={clientInputValue}
            onInputChange={(_, value) => setClientInputValue(value)}
            value={
              selectedSale.client ||
              (selectedSale.client_name
                ? ({ id: selectedSale.client_id, name: selectedSale.client_name } as Client)
                : null)
            }
            onChange={(_, newValue) => {
              if (typeof newValue === "string") {
                setInitialClientName(newValue);
                setIsClientModalOpen(true);
              } else if (newValue && newValue.inputValue) {
                setInitialClientName(newValue.inputValue);
                setIsClientModalOpen(true);
              } else {
                handleClientChange(newValue as Client | null);
              }
            }}
            renderOption={(props, option) => {
              const { key, ...rest } = props;
              return (
                <li key={key} {...rest}>{`${
                  option.is_supplier ? tSummary("supplierOptionLabel") : tSummary("clientOptionLabel")
                }: ${option.name}`}</li>
              );
            }}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            loading={clientSearchLoading}
            disabled={!selectedSale}
            freeSolo selectOnFocus clearOnBlur handleHomeEndKeys
            disableClearable={
              (selectedSale?.payments?.length ?? 0) > 0 &&
              !!(selectedSale?.client || selectedSale?.client_name)
            }
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={tSummary("clientSearchPlaceholder")}
                label={t("client")}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {clientSearchLoading && <CircularProgress color="inherit" size={14} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                InputLabelProps={{ sx: { fontSize: "0.8rem" } }}
                inputProps={{ ...params.inputProps, style: { fontSize: "0.8rem" } }}
              />
            )}
            noOptionsText={clientInputValue.trim() ? tSummary("noResults") : tSummary("typeToSearchGeneric")}
          />

          {/* ── Financials ── */}
          <Box sx={{ borderRadius: 1, border: "1px solid", borderColor: "grey.200", overflow: "hidden" }}>
            <FinRow label={t("subtotal")} value={formatNumber(subtotal, currencyDecimals)} bg="#f8fafc" />
            {discountAmt > 0 && (
              <FinRow label={t("discount")} value={`− ${formatNumber(discountAmt, currencyDecimals)}`} color="error.main" bg="#fff5f5" bold />
            )}
            <Divider />
            <FinRow label={tSummary("totalLabel")} value={formatNumber(total, currencyDecimals)} bold color="success.dark" />
            <Divider />
            <FinRow label={tSummary("paidLabel")} value={formatNumber(paid, currencyDecimals)} color="success.main" />
            <FinRow
              label={tSummary("remainingLabel")}
              value={formatNumber(due, currencyDecimals)}
              bold
              color={isFullyPaid ? "success.dark" : "error.dark"}
              bg={isFullyPaid ? "#f0fdf4" : "#fff5f5"}
            />
          </Box>
          {!selectedSale?.payments?.length > 0 && <Stack direction="row" alignItems="center" gap={0.5}>
            <FormControl size="small" sx={{ minWidth: 80 }}>
              <InputLabel sx={{ fontSize: "0.75rem" }}>{t("discount")}</InputLabel>
              <Select
                value={discountType}
                label={t("discount")}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                sx={{ fontSize: "0.75rem" }}
              >
                <MenuItem value="fixed" sx={{ fontSize: "0.75rem" }}>{tSummary("fixedAmountOption")}</MenuItem>
                <MenuItem value="percentage" sx={{ fontSize: "0.75rem" }}>{tSummary("percentSign")}</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="number"
              placeholder={discountType === "percentage" ? tSummary("percentSign") : "0"}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              inputProps={{ min: 0, max: discountType === "percentage" ? 100 : undefined, step: discountType === "percentage" ? 1 : 0.01 }}
              sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.85rem", fontWeight: 700, py: "6px" } }}
            />
            <IconButton
              size="small"
              onClick={handleApplyDiscount}
              disabled={!canDiscount || discountLoading || !discountValue.trim() || (selectedSale.items?.length ?? 0) === 0 || (selectedSale.payments?.length ?? 0) > 0}
              sx={{ bgcolor: "success.main", color: "white", "&:hover": { bgcolor: "success.dark" }, "&.Mui-disabled": { bgcolor: "grey.200" }, width: 28, height: 28, borderRadius: 1 }}
            >
              {discountLoading ? <CircularProgress size={14} color="inherit" /> : <CheckIcon sx={{ fontSize: 16 }} />}
            </IconButton>
            {discountAmt > 0 && (
              <Button
                size="small"
                variant="text"
                color="error"
                onClick={handleRemoveDiscount}
                disabled={!canDiscount || discountLoading || (selectedSale.payments?.length ?? 0) > 0}
                sx={{ fontSize: "0.65rem", px: 0.5, minWidth: 0, whiteSpace: "nowrap" }}
              >
                {tCommon("cancel")}
              </Button>
            )}
          </Stack>}

          {/* ── Payments List ── */}
          {(selectedSale.payments?.length ?? 0) > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: "block", mb: 0.4, fontSize: "0.68rem" }}>
                {t("payments")}
              </Typography>
              <Stack gap={0.4}>
                {selectedSale.payments!.map((p) => (
                  <Stack
                    key={p.id ?? `${p.method}-${p.amount}-${p.payment_date}`}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ px: 1, py: 0.4, borderRadius: 1, border: "1px solid", borderColor: "grey.200" }}
                  >
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <PaymentsIcon sx={{ fontSize: 12, color: "primary.main" }} />
                      <Typography sx={{ fontSize: "0.7rem" }} color="text.secondary">
                        {METHOD_LABEL_KEYS[p.method] ? tSummary(METHOD_LABEL_KEYS[p.method]) : p.method}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={0.25}>
                      <Typography sx={{ fontSize: "0.75rem" }} fontWeight={700} color="success.dark">
                        {formatNumber(Number(p.amount), currencyDecimals)}
                      </Typography>
                      {p.id != null && (
                        <IconButton size="small" color="error" onClick={() => handleDeletePayment(p.id!)} disabled={!canCancelPayment || deletingPaymentId === p.id} sx={{ p: 0.2 }}>
                          {deletingPaymentId === p.id
                            ? <CircularProgress size={12} color="inherit" />
                            : <DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                        </IconButton>
                      )}
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}

          {/* ── Add Payment ── */}
          {!isFullyPaid && (
            <Box sx={{ borderRadius: 1, border: "1px solid", borderColor: "primary.200", bgcolor: "#eff6ff", p: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.6}>
                <Typography sx={{ fontSize: "0.7rem" }} color="primary.dark" fontWeight={700}>{t("addPayment")}</Typography>
                <Typography sx={{ fontSize: "0.7rem" }} color="error.main" fontWeight={800}>
                  {tSummary("remainingColon", { amount: formatNumber(due, currencyDecimals) })}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" gap={0.5}>
                <FormControl size="small" sx={{ minWidth: 78 }}>
                  <InputLabel sx={{ fontSize: "0.75rem" }}>{tSummary("methodLabel")}</InputLabel>
                  <Select
                    value={newPaymentMethod}
                    label={tSummary("methodLabel")}
                    onChange={(e) => setNewPaymentMethod(e.target.value as Payment["method"])}
                    sx={{ fontSize: "0.75rem" }}
                  >
                    {activePaymentMethods.map((method) => (
                      <MenuItem key={method} value={method} sx={{ fontSize: "0.75rem" }}>
                        {tSummary(METHOD_LABEL_KEYS[method])}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  type="number"
                  placeholder={t("amount")}
                  value={newPaymentAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewPaymentAmount(e.target.value)}
                  inputProps={{ min: 0.01, step: 0.01 }}
                  sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.95rem", fontWeight: 800, py: "6px" } }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "+") { e.preventDefault(); handleAddPayment(); }
                  }}
                />
                <IconButton
                  size="small"
                  onClick={handleAddPayment}
                  disabled={!canPayment || addPaymentLoading || !newPaymentAmount.trim()}
                  sx={{ bgcolor: "primary.main", color: "white", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "grey.200" }, width: 30, height: 30, borderRadius: 1 }}
                >
                  {addPaymentLoading ? <CircularProgress size={14} color="inherit" /> : <AddIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Stack>
            </Box>
          )}

          {/* ── Notes ── */}
          {selectedSale.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ px: 1, py: 0.5, borderRadius: 1, bgcolor: "warning.50", border: "1px solid", borderColor: "warning.200", display: "block", fontSize: "0.68rem" }}>
              {selectedSale.notes}
            </Typography>
          )}

          {/* ── Actions ── */}
          <Box sx={{ mt: "auto", pt: 0.5, display: "flex", flexDirection: "column", gap: 0.5 }}>
            <Stack direction="row" gap={0.5}>
              <Button
                fullWidth variant="outlined" size="small"
                disabled={thermalPdfLoading}
                startIcon={<ReceiptLongIcon sx={{ fontSize: "0.85rem !important" }} />}
                onClick={handlePrintThermalInvoice}
                sx={{ textTransform: "none", fontSize: "0.7rem", fontWeight: 600, py: 0.5 }}
              >
                {thermalPdfLoading ? "..." : tSummary("printLabel")}
              </Button>
              <Button
                fullWidth variant="outlined" size="small"
                disabled={a4PdfLoading || !selectedSale?.client_id}
                startIcon={<PictureAsPdfIcon sx={{ fontSize: "0.85rem !important" }} />}
                onClick={(e) => setA4MenuAnchor(e.currentTarget)}
                sx={{ textTransform: "none", fontSize: "0.7rem", fontWeight: 600, py: 0.5 }}
              >
                {a4PdfLoading ? "..." : "A4 PDF"}
              </Button>
              <Menu
                anchorEl={a4MenuAnchor}
                open={Boolean(a4MenuAnchor)}
                onClose={() => setA4MenuAnchor(null)}
              >
                <MenuItem
                  onClick={() => {
                    setA4MenuAnchor(null);
                    handlePrintA4Invoice("local");
                  }}
                >
                  {tSummary("a4InvoiceLocalOption")}
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setA4MenuAnchor(null);
                    handlePrintA4Invoice("usd");
                  }}
                >
                  {tSummary("a4InvoiceUsdOption")}
                </MenuItem>
              </Menu>
              <Button
                fullWidth variant="outlined" size="small"
                disabled={whatsAppLoading || !selectedSale?.client_id}
                startIcon={<WhatsAppIcon sx={{ fontSize: "0.85rem !important" }} />}
                onClick={handleSendWhatsApp}
                sx={{ textTransform: "none", fontSize: "0.7rem", fontWeight: 600, py: 0.5, color: "success.main", borderColor: "success.main", "&:hover": { borderColor: "success.dark", bgcolor: "success.50" } }}
              >
                {whatsAppLoading ? "..." : tSummary("whatsappLabel")}
              </Button>
            </Stack>

            <Button
              fullWidth variant="contained" size="small"
              disabled={!canPayment || fullPaymentLoading || isFullyPaid}
              onClick={handleFullPayment}
              sx={{
                textTransform: "none", fontWeight: 700, fontSize: "0.8rem", py: 0.75,
                bgcolor: isFullyPaid ? "success.main" : "primary.main",
                "&:hover": { bgcolor: isFullyPaid ? "success.dark" : "primary.dark" },
              }}
            >
              {fullPaymentLoading
                ? <CircularProgress size={16} color="inherit" />
                : isFullyPaid ? tSummary("fullyPaidLabel") : tSummary("fullPaymentLabel")}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
