// src/components/pos/OfflinePaymentDialog.tsx
import React, { useState, useEffect, useRef } from "react";

// MUI Components
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Divider,
  Chip,
  CircularProgress,
  Paper,
  IconButton,
  useTheme,
  InputAdornment,
  alpha,
  Stack,
} from "@mui/material";

// MUI Icons
import {
  CreditCard as CreditCardIcon,
  Delete as DeleteIcon,
  AttachMoney as CashIcon,
  AccountBalance as BankIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";

// Types
import { PaymentMethod } from "./types";
import { OfflineSale } from "../../services/db";
import { formatNumber, preciseSum } from "@/constants";
import { useCurrencySymbol } from "@/hooks/useFormatCurrency";

// Payment Method Options with Icons and Colors
const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { value: "cash", label: "نقدي", icon: <CashIcon />, color: "#10B981" }, // Emerald
  {
    value: "bank_transfer",
    label: "تحويل بنكي",
    icon: <BankIcon />,
    color: "#6366F1",
  }, // Indigo
];

interface OfflinePaymentDialogProps {
  open: boolean;
  onClose: () => void;
  currentSale: OfflineSale;
  onUpdateSale: (sale: OfflineSale) => void;
  onComplete: () => Promise<void> | void;
}

export const OfflinePaymentDialog: React.FC<OfflinePaymentDialogProps> = ({
  open,
  onClose,
  currentSale,
  onUpdateSale,
  onComplete,
}) => {
  const theme = useTheme();
  const currencySymbol = useCurrencySymbol();

  // State for new payment form
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [paymentAmount, setPaymentAmount] = useState<string>("");

  // State for operations
  const [addingPayment, setAddingPayment] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Payments come directly from the currentSale object
  const payments = currentSale.payments || [];

  // Totals
  const grandTotal = Number(currentSale.total_amount || 0);
  const totalPaid = preciseSum(
    payments.map((p) => Number(p.amount)),
    2
  );
  const remainingDue = Math.max(0, grandTotal - totalPaid);
  const isFullyPaid = remainingDue <= 0.01; // Tolerance for float

  // Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      setError(null);
      setCompleting(false);
      if (remainingDue > 0) {
        setPaymentAmount(remainingDue.toFixed(2));
      } else {
        setPaymentAmount("");
      }

      // Auto-focus logic
      setTimeout(() => {
        // Focus input or add button depending on state
        if (remainingDue > 0) {
          inputRef.current?.focus();
          inputRef.current?.select();
        } else {
          addButtonRef.current?.focus();
        }
      }, 100);
    } else {
      resetForm();
    }
  }, [open, remainingDue]);

  const resetForm = () => {
    setPaymentMethod("cash");
    setPaymentAmount("");
    setError(null);
    setCompleting(false);
  };

  const handleAddPayment = async () => {
    if (!paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (amount <= 0) {
      setError("مبلغ الدفع يجب أن يكون أكبر من صفر");
      return;
    }

    if (amount > remainingDue + 0.01 && !isFullyPaid) {
      setError("المبلغ المدخل أكبر من المستحق");
      return;
    }

    setAddingPayment(true);
    setError(null);

    try {
      const newPayment: any = {
        method: paymentMethod,
        amount: amount,
        payment_date: new Date().toISOString().split("T")[0],
        notes: null,
      };

      const updatedPayments = [...payments, newPayment];

      const updatedSale = {
        ...currentSale,
        payments: updatedPayments,
        paid_amount: preciseSum(
          updatedPayments.map((p) => Number(p.amount)),
          2
        ),
      };

      onUpdateSale(updatedSale);
      setPaymentAmount("");
    } catch (err) {
      console.error("Failed to add payment:", err);
      setError("فشل إضافة الدفعة");
    } finally {
      setAddingPayment(false);
    }
  };

  const handleDeletePayment = async (index: number) => {
    try {
      const updatedPayments = [...payments];
      updatedPayments.splice(index, 1);

      const updatedSale = {
        ...currentSale,
        payments: updatedPayments,
        paid_amount: preciseSum(
          updatedPayments.map((p) => Number(p.amount)),
          2
        ),
      };

      onUpdateSale(updatedSale);
    } catch (err) {
      console.error("Failed to delete payment", err);
      setError("فشل حذف الدفعة");
    }
  };

  const handleCompleteClick = async () => {
    setCompleting(true);
    try {
      await onComplete();
      onClose(); // Only close if successful
    } catch (err) {
      console.error("Complete sale failed", err);
      setError("فشل إتمام البيع، يرجى المحاولة مرة أخرى");
    } finally {
      setCompleting(false);
    }
  };

  const getMethodDetails = (methodValue: string) => {
    return (
      PAYMENT_METHODS.find((m) => m.value === methodValue) || {
        label: methodValue,
        icon: <CreditCardIcon />,
        color: "#64748B",
      }
    );
  };

  // Quick Amount Suggestions
  const renderQuickAmounts = () => {
    if (remainingDue <= 0) return null;
    const suggestions = [
      remainingDue,
      Math.ceil(remainingDue / 10) * 10,
      Math.ceil(remainingDue / 50) * 50,
      Math.ceil(remainingDue / 100) * 100,
    ];
    // Filter unique positive vals
    const uniqueSuggestions = Array.from(new Set(suggestions)).filter(
      (v) => v > 0
    );

    return (
      <Stack
        direction="row"
        spacing={1}
        sx={{ mt: 1, flexWrap: "wrap", gap: 1 }}
      >
        {uniqueSuggestions.map((val) => (
          <Chip
            key={val}
            label={formatNumber(val)}
            onClick={() => setPaymentAmount(val.toString())}
            clickable
            size="small"
            variant="outlined"
            color="primary"
            sx={{ borderRadius: "8px" }}
          />
        ))}
      </Stack>
    );
  };

  // Handle Enter key for completion
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open || completing) return;

      // Ignore if typing in an input field or pressing a button
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "BUTTON"].includes(target.tagName)) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault(); // Prevent default browser behavior
        handleCompleteClick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, completing, handleCompleteClick]);

  return (
    <Dialog
      open={open}
      onClose={!completing ? onClose : undefined}
      // maxWidth="md"
      // fullWidth

      dir="rtl"
      PaperProps={{
        sx: {
          minWidth: "333px",
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          backgroundImage: "none",
          bgcolor: "background.paper",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          إدارة الدفع
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={completing}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <Divider />

      <DialogContent sx={{ p: { xs: 2, md: 4 } }}>
        {/* Layout Container: Flex instead of Grid */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 4,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Left Side: Payment Entry (Only if pending) */}
          {!isFullyPaid && (
            <Box sx={{ flex: { md: 7 }, minWidth: 0 }}>
              {/* Summary Header for Entry */}
              <Box
                sx={{
                  mb: 3,
                  p: 2,
                  bgcolor: "primary.50",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "primary.100",
                }}
              >
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="subtitle1" color="primary.800">
                    المبلغ المستحق
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {formatNumber(remainingDue)}{" "}
                    <span style={{ fontSize: "0.8rem" }}>{currencySymbol}</span>
                  </Typography>
                </Stack>
              </Box>

              <Typography
                variant="subtitle2"
                fontWeight="bold"
                gutterBottom
                sx={{ mb: 1.5 }}
              >
                طريقة الدفع
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 1.5,
                  mb: 3,
                }}
              >
                {PAYMENT_METHODS.map((method) => (
                  <Paper
                    key={method.value}
                    elevation={0}
                    onClick={() => setPaymentMethod(method.value)}
                    sx={{
                      p: 1.5,
                      border: "1px solid",
                      borderColor:
                        paymentMethod === method.value
                          ? method.color
                          : "divider",
                      bgcolor:
                        paymentMethod === method.value
                          ? alpha(method.color, 0.05)
                          : "transparent",
                      borderRadius: 2,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 1,
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: method.color,
                        bgcolor: alpha(method.color, 0.02),
                      },
                    }}
                  >
                    <Box sx={{ color: method.color, display: "flex" }}>
                      {React.cloneElement(method.icon as React.ReactElement, {
                        fontSize: "small",
                      })}
                    </Box>
                    <Typography
                      variant="body2"
                      fontWeight={
                        paymentMethod === method.value ? "bold" : "medium"
                      }
                    >
                      {method.label}
                    </Typography>
                  </Paper>
                ))}
              </Box>

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                المبلغ المدفوع
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <TextField
                  inputRef={inputRef}
                  fullWidth
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  type="number"
                  variant="outlined"
                  error={!!error}
                  helperText={error}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">{currencySymbol}</InputAdornment>
                    ),
                    sx: { fontSize: "1.25rem", fontWeight: "bold" },
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      if (paymentAmount) {
                        handleAddPayment();
                      } else if (isFullyPaid) {
                        handleCompleteClick();
                      }
                    }
                  }}
                />
                <Button
                  ref={addButtonRef}
                  variant="contained"
                  size="large"
                  disabled={addingPayment || !paymentAmount}
                  onClick={handleAddPayment}
                  sx={{
                    height: 56,
                    minWidth: 100,
                    borderRadius: 2,
                    boxShadow: "none",
                  }}
                >
                  {addingPayment ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    "إضافة"
                  )}
                </Button>
              </Box>
              {renderQuickAmounts()}
            </Box>
          )}

          {/* Right/Bottom Side: History & Action */}
          <Box
            sx={{
              flex: { md: isFullyPaid ? "1 1 100%" : 5 }, // If fully paid, take full width
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              borderLeft: { md: isFullyPaid ? "none" : "1px solid" },
              borderColor: "divider",
              pl: { md: isFullyPaid ? 0 : 3 },
              pt: { xs: 2, md: 0 },
              // Ensure this panel fills the height if displayed side-by-side, but adapts if full width
              height: "100%",
              minHeight: 300,
              maxWidth: 333,
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight="bold"
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
            >
              <ReceiptIcon color="action" fontSize="small" />
              المدفوعات
            </Typography>

            <Box
              sx={{ flex: 1, overflowY: "auto", maxHeight: 400, width: "100%" }}
            >
              {payments.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 4,
                    px: 2,
                    bgcolor: "grey.50",
                    borderRadius: 2,
                    border: "1px dashed",
                    borderColor: "divider",
                    mx: "auto",
                    maxWidth: isFullyPaid ? 500 : "100%",
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    لم يتم استلام أي دفعات بعد
                  </Typography>
                </Box>
              ) : (
                <Stack
                  spacing={1}
                  sx={{
                    width: "100%",
                    mx: "auto",
                    maxWidth: isFullyPaid ? 600 : "100%",
                  }}
                >
                  {payments.map((p, idx) => {
                    const details = getMethodDetails(p.method);
                    return (
                      <Paper
                        key={idx}
                        elevation={0}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          "&:hover": { bgcolor: "grey.50" },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              p: 0.8,
                              borderRadius: "50%",
                              bgcolor: alpha(details.color, 0.1),
                              color: details.color,
                              display: "flex",
                            }}
                          >
                            {React.cloneElement(
                              details.icon as React.ReactElement,
                              { fontSize: "small" }
                            )}
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {details.label}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {formatNumber(Number(p.amount))} {currencySymbol}
                            </Typography>
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeletePayment(idx)}
                          sx={{
                            opacity: 0.6,
                            "&:hover": { opacity: 1, bgcolor: "error.50" },
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>

            {/* Summary Footer on right side */}
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: "1px dashed",
                borderColor: "divider",
                width: "100%",
                mx: "auto",
                maxWidth: isFullyPaid ? 600 : "100%",
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  المطلوب
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {formatNumber(grandTotal)}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  المدفوع
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="success.main"
                >
                  {formatNumber(totalPaid)}
                </Typography>
              </Stack>

              {/* {isFullyPaid && (
                            <Alert 
                                icon={<CheckCircleIcon fontSize="inherit" />} 
                                severity="success" 
                                variant="filled"
                                sx={{ mb: 2, borderRadius: 2 }}
                            >
                                تم سداد كامل المبلغ
                            </Alert>
                        )} */}

              <Button
                fullWidth
                variant="contained"
                color={isFullyPaid ? "success" : "primary"}
                size="large"
                onClick={handleCompleteClick}
                disabled={completing}
                sx={{
                  borderRadius: 2,
                  // py: 1.5,
                  fontWeight: "bold",
                  boxShadow: "none",
                }}
              >
                {completing ? (
                  <CircularProgress size={24} color="inherit" />
                ) : isFullyPaid ? (
                  "إتمام وحفظ العمليه"
                ) : (
                  "حفظ (دفع جزئي)"
                )}
              </Button>
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
