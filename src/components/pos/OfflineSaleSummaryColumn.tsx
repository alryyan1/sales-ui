// src/components/pos/OfflineSaleSummaryColumn.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Card,
  CardContent,
  Button,
  Divider,
  TextField,
  Box,
  Typography,
  Autocomplete,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";

// MUI Icons
import {
  Percent as PercentIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

// Types
import { CartItem } from "./types";
import { OfflineSale } from "../../services/db";
import { formatNumber, preciseSum, preciseCalculation } from "@/constants";
import dayjs from "dayjs";
import { Plus, Printer, FileText } from "lucide-react";
import { PDFViewer } from "@react-pdf/renderer";
import { PosInvoicePdf } from "./PosInvoicePdf";
import { OfflineInvoiceA4Pdf } from "./OfflineInvoiceA4Pdf";

// Import the dialogs
import { OfflinePaymentDialog } from "./OfflinePaymentDialog";
import { DiscountDialog } from "./DiscountDialog";
import ClientFormModal from "../clients/ClientFormModal";
import { offlineSaleService } from "../../services/offlineSaleService";
import { Client } from "../../services/clientService";
import { dbService } from "../../services/db";
import settingService, { AppSettings } from "../../services/settingService";

interface OfflineSaleSummaryColumnProps {
  currentSale: OfflineSale;
  currentSaleItems: CartItem[]; // To calculate subtotal etc
  onUpdateSale: (sale: OfflineSale) => void;
  onCompleteSale: () => Promise<void> | void; // Trigger for parent to sync/finalize
  isPaymentDialogOpen: boolean;
  onPaymentDialogOpenChange: (isOpen: boolean) => void;
  clients: any[]; // Passed from parent
  onClientAdded: (client: Client) => void;
}

export const OfflineSaleSummaryColumn: React.FC<
  OfflineSaleSummaryColumnProps
> = ({
  currentSale,
  currentSaleItems,
  onUpdateSale,
  onCompleteSale,
  isPaymentDialogOpen,
  onPaymentDialogOpenChange,
  clients,
  onClientAdded,
}) => {
  // Dialog states
  // const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false); // Lifted up
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false);
  const [isA4PdfDialogOpen, setIsA4PdfDialogOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      // 1. Try to fetch fresh settings from API
      if (navigator.onLine) {
        try {
          console.log("Fetching settings from API...");
          const remoteSettings = await settingService.getSettings();
          if (remoteSettings) {
            console.log("Settings fetched:", remoteSettings);
            setSettings(remoteSettings);
            // Try to cache, but don't fail if DB is old/locked
            try {
              await dbService.saveSettings(remoteSettings);
            } catch (dbErr) {
              console.warn("Failed to cache settings to DB:", dbErr);
            }
            return; // Success
          }
        } catch (apiErr) {
          console.error("API Settings fetch failed:", apiErr);
        }
      }

      // 2. Fallback to local DB if API failed or offline
      try {
        const localSettings = await dbService.getSettings();
        if (localSettings) {
          console.log("Loaded cached settings:", localSettings);
          setSettings(localSettings);
        }
      } catch (dbErr) {
        console.warn(
          "Local DB settings load failed (store might be missing):",
          dbErr
        );
      }
    };
    loadSettings();
  }, []);

  // Date editing state
  const [isDateEditing, setIsDateEditing] = useState(false);
  const [editingDate, setEditingDate] = useState("");

  // Calculate totals
  const subtotal = preciseSum(
    currentSaleItems.map((item) => item.total),
    2
  );

  // Discount
  const discountAmount = Number(currentSale.discount_amount || 0);
  const discountType = currentSale.discount_type || "fixed"; // We can add this to OfflineSale type if missing, or assume fixed/percent logic

  // Calculate final discount value
  const discountValue =
    discountType === "percentage"
      ? preciseCalculation(subtotal, discountAmount / 100, "multiply", 2)
      : discountAmount;

  const actualDiscountValue = Math.min(discountValue, subtotal);
  const grandTotal = preciseCalculation(
    subtotal,
    actualDiscountValue,
    "subtract",
    2
  );
  const isDiscountApplied = actualDiscountValue > 0;

  // Paid amount
  const payments = currentSale.payments || [];
  const paidAmount = preciseSum(
    payments.map((p) => Number(p.amount)),
    2
  );

  // Sync totals back to sale object if they differ (e.g. if items changed)
  useEffect(() => {
    // NOTE: We rely on the parent (which calls offlineSaleService.calculateTotals) to keep currentSale.total_amount correct.
  }, [subtotal, actualDiscountValue]);

  // Handle discount update
  const handleDiscountUpdate = (
    amount: number,
    type: "percentage" | "fixed"
  ) => {
    const updatedSale = {
      ...currentSale,
      discount_amount: amount,
      discount_type: type,
    };
    // Recalculate totals
    const calculatedSale = offlineSaleService.calculateTotals(updatedSale);

    onUpdateSale(calculatedSale);
  };

  // Handle date editing
  const handleDateClick = () => {
    // OfflineSale uses 'sale_date' string usually
    if (currentSale.sale_date) {
      setEditingDate(currentSale.sale_date);
      setIsDateEditing(true);
    }
  };

  const handleDateSave = () => {
    if (editingDate) {
      const updatedSale = { ...currentSale, sale_date: editingDate };
      onUpdateSale(updatedSale);
      setIsDateEditing(false);
    }
  };

  const handleDateCancel = () => {
    setIsDateEditing(false);
    setEditingDate("");
  };

  // Final Payment Success (from dialog "Complete Sale")
  const handlePaymentComplete = async () => {
    // The payment dialog updates the sale object with payments.
    // Now we just confirm completion
    await onCompleteSale();
  };

  // Shortcut for payment (+) - REMOVED, handled in parent
  // useEffect(() => { ... })

  const handlePrintPdf = () => {
    setIsPdfDialogOpen(true);
  };

  const handlePrintA4Pdf = () => {
    setIsA4PdfDialogOpen(true);
  };

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <CardContent
          sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1 }}
        >
          {currentSale.is_synced && currentSale.id && (
            <Box
              sx={{
                textAlign: "center",
                fontSize: "1.5rem",
                fontWeight: "bold",
                border: 1,
                borderBottom: 2,
                background: "linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)",
                color: "white",
                borderRadius: 1,
                py: 1,
              }}
            >
              {`#${currentSale.id}`}
            </Box>
          )}

          {/* Client Selection */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.name || ""}
                value={
                  clients.find((c) => c.id === currentSale.client_id) || null
                }
                onChange={(_, newValue) => {
                  onUpdateSale({
                    ...currentSale,
                    client_id: newValue ? newValue.id : null,
                    client_name: newValue ? newValue.name : null,
                  });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="العميل"
                    size="small"
                    variant="outlined"
                    fullWidth
                    placeholder="اختر عميل..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {option.name}
                      </Typography>
                      {option.phone && (
                        <Typography variant="caption" color="text.secondary">
                          {option.phone}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
              />
            </Box>
            <Button
              variant="outlined"
              sx={{
                minWidth: "40px",
                width: "40px",
                height: "40px",
                p: 0,
                borderRadius: 1,
              }}
              onClick={() => setIsClientModalOpen(true)}
            >
              <Plus size={20} />
            </Button>
          </Box>

          {/* Row 1: Date/Time */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              bgcolor: "blue.50",
              p: 1,
              borderRadius: 1,
            }}
          >
            {/* Center - Time */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                الوقت
              </Typography>
              <Typography variant="body2" fontWeight="semibold">
                {dayjs(currentSale.offline_created_at || Date.now()).format(
                  "HH:mm A"
                )}
              </Typography>
            </Box>

            {/* Right - Date with edit icon */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                textAlign: "right",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                التاريخ
              </Typography>
              {isDateEditing ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <TextField
                    type="date"
                    value={editingDate}
                    onChange={(e) => setEditingDate(e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                    inputProps={{ style: { fontSize: "0.75rem" } }}
                  />
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleDateSave}
                    sx={{ minWidth: "auto", p: 0.5 }}
                  >
                    <CheckIcon
                      fontSize="small"
                      sx={{ color: "success.main" }}
                    />
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={handleDateCancel}
                    sx={{ minWidth: "auto", p: 0.5 }}
                  >
                    <CloseIcon fontSize="small" sx={{ color: "error.main" }} />
                  </Button>
                </Box>
              ) : (
                <Box
                  onClick={handleDateClick}
                  sx={{
                    cursor: "pointer",
                    "&:hover": { bgcolor: "blue.100" },
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    transition: "background-color 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.5,
                  }}
                  title="انقر لتعديل التاريخ"
                >
                  <Typography variant="body2" fontWeight="semibold">
                    {currentSale.sale_date}
                  </Typography>
                  <EditIcon fontSize="small" sx={{ color: "primary.main" }} />
                </Box>
              )}
            </Box>
          </Box>

          <Divider />

          {/* Row 3: Monetary Info */}
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 0.5, flex: 1 }}
          >
            {/* Items count and subtotal */}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                العناصر ({currentSaleItems.length})
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatNumber(subtotal)}
              </Typography>
            </Box>

            {/* Discount row with button */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  الخصم
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setIsDiscountDialogOpen(true)}
                  sx={{
                    minWidth: "auto",
                    px: 1,
                    height: 24,
                    ...(isDiscountApplied && {
                      bgcolor: "error.50",
                      color: "error.700",
                      borderColor: "error.300",
                      "&:hover": { bgcolor: "error.100" },
                    }),
                  }}
                  title={
                    isDiscountApplied
                      ? `الخصم: ${formatNumber(actualDiscountValue)}`
                      : "تعيين الخصم"
                  }
                >
                  <PercentIcon
                    fontSize="small"
                    sx={{
                      fontSize: 12,
                      color: isDiscountApplied ? "error.main" : "inherit",
                    }}
                  />
                </Button>
              </Box>
              <Typography
                variant="body2"
                fontWeight="medium"
                color="error.main"
              >
                {actualDiscountValue > 0
                  ? `-${formatNumber(actualDiscountValue)}`
                  : "0.00"}
              </Typography>
            </Box>

            {/* Total Amount */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.5rem",
                fontWeight: "bold",
                borderTop: 1,
                borderColor: "divider",
                pt: 1,
                mt: "auto",
              }}
            >
              <Typography variant="h5" fontWeight="bold">
                الإجمالي
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatNumber(grandTotal)}
              </Typography>
            </Box>

            {/* Paid Amount */}
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" color="text.secondary">
                المدفوع
              </Typography>
              <Typography variant="body2" fontWeight="medium" color="info.main">
                {formatNumber(paidAmount)}
              </Typography>
            </Box>

            {/* Due Amount */}
            {grandTotal - paidAmount > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  المستحق
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="medium"
                  color="warning.main"
                >
                  {formatNumber(grandTotal - paidAmount)}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider />

          {/* Print Invoice Button (Thermal) */}
          {currentSale.items.length > 0 && (
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Printer size={18} />}
              onClick={handlePrintPdf}
              sx={{ mb: 1, py: 1 }}
            >
              طباعة فاتورة (حراري)
            </Button>
          )}

          {/* NEW: Print A4 Invoice Button (Only if client selected) */}
          {currentSale.items.length > 0 && currentSale.client_id && (
            <Button
              variant="outlined"
              fullWidth
              color="secondary"
              startIcon={<FileText size={18} />}
              onClick={handlePrintA4Pdf}
              sx={{ mb: 1, py: 1 }}
            >
              طباعة فاتورة (A4)
            </Button>
          )}

          {/* Add Payment Button */}
          <Button
            onClick={() => onPaymentDialogOpenChange(true)}
            variant="contained"
            fullWidth
            size="large"
            disabled={grandTotal <= 0 || currentSale.status === "completed"}
            sx={{
              py: 2,
              minHeight: 56,
              fontSize: "1.3rem",
              fontWeight: 700,
              borderRadius: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease-in-out",
              ...(paidAmount > 0 && {
                bgcolor: "success.main",
                "&:hover": { 
                  bgcolor: "success.dark",
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
                },
              }),
              ...(!paidAmount && {
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
                },
              }),
            }}
          >
            {currentSale.status === "completed"
              ? "تم اكتمال البيع"
              : paidAmount > 0
              ? "إدارة الدفع / إكمال"
              : "الدفع"}
          </Button>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <OfflinePaymentDialog
        open={isPaymentDialogOpen}
        onClose={() => onPaymentDialogOpenChange(false)}
        currentSale={currentSale}
        onUpdateSale={onUpdateSale}
        onComplete={handlePaymentComplete}
      />

      {/* Discount Dialog */}
      <DiscountDialog
        open={isDiscountDialogOpen}
        onClose={() => setIsDiscountDialogOpen(false)}
        currentAmount={discountAmount}
        currentType={discountType as "percentage" | "fixed"}
        maxAmount={subtotal}
        dueAmount={Math.max(0, grandTotal - paidAmount)}
        onSave={handleDiscountUpdate}
      />

      {/* Client Modal */}
      <ClientFormModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        clientToEdit={null}
        onSaveSuccess={(client) => {
          if (client) {
            onClientAdded(client);
            // Auto select the new client
            onUpdateSale({
              ...currentSale,
              client_id: client.id,
              client_name: client.name,
            });
          }
        }}
      />

      {/* PDF Viewer Dialog - Thermal */}
      <Dialog
        open={isPdfDialogOpen}
        onClose={() => setIsPdfDialogOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: { width: "380px", maxWidth: "100%", height: "90vh", m: 2 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          معاينة الفاتورة الحرارية
          <IconButton onClick={() => setIsPdfDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: "80vh", p: 0 }}>
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            <PosInvoicePdf
              sale={currentSale}
              items={currentSale.items}
              userName="الكاشير"
              settings={settings}
            />
          </PDFViewer>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog - A4 */}
      <Dialog
        open={isA4PdfDialogOpen}
        onClose={() => setIsA4PdfDialogOpen(false)}
        maxWidth={false}
        PaperProps={{
          sx: { width: "800px", maxWidth: "90vw", height: "90vh", m: 2 },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          معاينة الفاتورة (A4)
          <IconButton onClick={() => setIsA4PdfDialogOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: "80vh", p: 0 }}>
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            <OfflineInvoiceA4Pdf
              sale={currentSale}
              items={currentSale.items}
              userName="الكاشير"
              settings={settings}
            />
          </PDFViewer>
        </DialogContent>
      </Dialog>
    </Box>
  );
};
