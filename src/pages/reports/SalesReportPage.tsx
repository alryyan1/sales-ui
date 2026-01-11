// src/pages/reports/SalesReportPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

// MUI Components
import {
  Box,
  Button,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
} from "@mui/material";
import IconButton from "@mui/material/IconButton";

// Lucide Icons
import { ArrowLeft, Download, FileText, X } from "lucide-react";

import apiClient from "@/lib/axios";
// Services and Types
import saleService, { Sale } from "@/services/saleService";
import { PosShiftReportPdf } from "@/components/pos/PosShiftReportPdf";
import { useSettings } from "@/context/SettingsContext";
import { PDFViewer } from "@react-pdf/renderer";

// React Query Hooks
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useShifts } from "@/hooks/useShifts";
import { useSalesReport } from "@/hooks/useSalesReport";

// New Sub-components
import ReportFilters, {
  ReportFilterValues,
} from "@/components/reports/sales/ReportFilters";
import { ReportStats } from "@/components/reports/sales/ReportStats";
import { SalesTable } from "@/components/reports/sales/SalesTable";
import SaleDetailsDialog from "@/components/reports/sales/SaleDetailsDialog";

// --- Component ---
const SalesReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- State for Dialogs ---
  const [saleDetailsDialogOpen, setSaleDetailsDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false);
  const [shiftReportDialogOpen, setShiftReportDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<{
    id: number;
    opened_at: string | null;
    closed_at: string | null;
    is_open: boolean;
  } | null>(null);

  const { getSetting, settings } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  // --- Current Filters and Page ---
  const currentFilters = useMemo(
    () => ({
      startDate:
        searchParams.get("startDate") || format(new Date(), "yyyy-MM-dd"),
      endDate: searchParams.get("endDate") || format(new Date(), "yyyy-MM-dd"),
      clientId: searchParams.get("clientId") || null,
      userId: searchParams.get("userId") || null,
      shiftId: searchParams.get("shiftId") || null,
      productId: searchParams.get("productId") || null,
    }),
    [searchParams]
  );

  const initialFilterValues: ReportFilterValues = currentFilters;

  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  // --- React Query Hooks (for shift report PDF data) ---
  const { data: clientsData, isLoading: loadingClients } = useClients();
  const clients = clientsData?.data || [];

  const { data: productsData, isLoading: loadingProducts } = useProducts({
    page: 1,
    perPage: 1000,
  });
  const products = productsData?.data || [];

  const { data: shifts = [], isLoading: loadingShifts } = useShifts();

  const { data: reportData } = useSalesReport({
    page: currentPage,
    startDate: currentFilters.startDate,
    endDate: currentFilters.endDate,
    clientId: currentFilters.clientId ? Number(currentFilters.clientId) : null,
    userId: currentFilters.userId ? Number(currentFilters.userId) : null,
    shiftId: currentFilters.shiftId ? Number(currentFilters.shiftId) : null,
    productId: currentFilters.productId
      ? Number(currentFilters.productId)
      : null,
    limit: 25,
    posMode,
  });

  const loadingFilters = loadingClients || loadingProducts || loadingShifts;

  // --- Auto-select last shift on first load ---
  useEffect(() => {
    if (
      posMode === "shift" &&
      !searchParams.get("shiftId") &&
      shifts.length > 0
    ) {
      const lastShift = shifts.reduce((prev, current) =>
        prev.id > current.id ? prev : current
      );
      const newParams = new URLSearchParams(searchParams);
      newParams.set("shiftId", String(lastShift.id));
      setSearchParams(newParams, { replace: true });
    }
  }, [shifts, searchParams, setSearchParams, posMode]);

  // --- Filter Handlers ---
  const onFilterSubmit = (data: ReportFilterValues) => {
    const newParams = new URLSearchParams();
    if (data.startDate) newParams.set("startDate", data.startDate);
    if (data.endDate) newParams.set("endDate", data.endDate);
    if (data.clientId) newParams.set("clientId", data.clientId);
    if (data.userId) newParams.set("userId", data.userId);
    if (data.shiftId) newParams.set("shiftId", data.shiftId);
    if (data.productId) newParams.set("productId", data.productId);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({ page: "1" });
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  // --- Download PDF ---
  const handleDownloadPdf = async () => {
    if (currentFilters.shiftId) {
      try {
        const shiftId = Number(currentFilters.shiftId);
        const shiftFromList = shifts.find((s) => s.id === shiftId);

        if (shiftFromList) {
          const currentShiftResponse = await apiClient
            .get("/shifts/current")
            .catch(() => ({ data: null }));
          const currentShift =
            currentShiftResponse.data?.data || currentShiftResponse.data;

          if (currentShift && currentShift.id === shiftId) {
            setSelectedShift({
              id: currentShift.id,
              opened_at: currentShift.opened_at,
              closed_at: currentShift.closed_at,
              is_open: currentShift.is_open || !currentShift.closed_at,
            });
          } else {
            setSelectedShift({
              id: shiftFromList.id,
              opened_at: shiftFromList.shift_date
                ? `${shiftFromList.shift_date}T00:00:00`
                : null,
              closed_at: null,
              is_open: true,
            });
          }
          setShiftReportDialogOpen(true);
        } else {
          handleBackendPdf();
        }
      } catch (error) {
        console.error("Error fetching shift:", error);
        handleBackendPdf();
      }
    } else {
      handleBackendPdf();
    }
  };

  const handleBackendPdf = () => {
    const params = new URLSearchParams();
    if (currentFilters.startDate)
      params.append("start_date", currentFilters.startDate);
    if (currentFilters.endDate)
      params.append("end_date", currentFilters.endDate);
    if (currentFilters.clientId)
      params.append("client_id", String(currentFilters.clientId));
    if (currentFilters.userId)
      params.append("user_id", String(currentFilters.userId));
    if (currentFilters.shiftId)
      params.append("shift_id", String(currentFilters.shiftId));

    const pdfUrl = `${
      import.meta.env.VITE_API_BASE_URL
    }/reports/sales/pdf?${params.toString()}`;
    window.open(pdfUrl, "_blank");
    toast.info("جاري فتح PDF في تبويب جديد...");
  };

  return (
    <Box sx={{ minHeight: "100vh" }}>
      {/* Header */}
      <Box
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ maxWidth: "100%", px: { xs: 2, sm: 3, lg: 4 }, py: 2.5 }}>
          <Stack direction="column" spacing={3}>
            {/* Top Bar: Title & Actions */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={2}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <IconButton
                  onClick={() => navigate("/dashboard")}
                  size="small"
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    transition: "all 0.15s ease",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ArrowLeft size={18} />
                </IconButton>
                <Box>
                  <Typography
                    variant="h6"
                    component="h1"
                    sx={{ fontWeight: 600, lineHeight: 1.3 }}
                  >
                    تقرير المبيعات
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25 }}
                  >
                    عرض وتصدير تقارير المبيعات
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" gap={1} spacing={2}>
                <Button
                  onClick={handleBackendPdf}
                  variant="outlined"
                  size="small"
                  startIcon={<FileText size={16} />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    px: 2.5,
                    py: 1,
                    fontWeight: 500,
                  }}
                >
                  تصدير تقرير مفصل
                </Button>
                <Button
                  onClick={handleDownloadPdf}
                  variant="contained"
                  size="small"
                  startIcon={<Download size={16} />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    px: 2.5,
                    py: 1,
                    fontWeight: 500,
                    boxShadow: "none",
                    "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.15)" },
                  }}
                >
                  تصدير PDF
                </Button>
              </Stack>
            </Stack>

            {/* Filters component */}
            <ReportFilters
              initialValues={initialFilterValues}
              onFilterSubmit={onFilterSubmit}
              onClearFilters={clearFilters}
              clients={clients}
              products={products}
              shifts={shifts}
              loadingFilters={loadingFilters}
              posMode={posMode}
            />
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: "1400px",
          mx: "auto",
          px: { xs: 2, sm: 3, lg: 4 },
          py: 3,
        }}
      >
        {/* Stats Component */}
        <ReportStats filterValues={currentFilters} />

        {/* Sales Table Component */}
        <SalesTable
          filterValues={currentFilters}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onRowClick={async (id) => {
            setLoadingSaleDetails(true);
            setSaleDetailsDialogOpen(true);
            try {
              const fullSale = await saleService.getSale(id);
              setSelectedSale(fullSale);
            } catch (err) {
              console.error("Failed to fetch sale details:", err);
              toast.error("خطأ في تحميل تفاصيل العملية");
              setSaleDetailsDialogOpen(false);
            } finally {
              setLoadingSaleDetails(false);
            }
          }}
        />
      </Box>

      {/* Sale Details Dialog */}
      <SaleDetailsDialog
        open={saleDetailsDialogOpen}
        onClose={() => {
          setSaleDetailsDialogOpen(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        loading={loadingSaleDetails}
      />

      {/* Shift Report Dialog */}
      <Dialog
        open={shiftReportDialogOpen}
        onClose={() => setShiftReportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">تقرير الوردية</Typography>
          <IconButton onClick={() => setShiftReportDialogOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ height: "80vh", p: 0 }}>
          {selectedShift && reportData && (
            <PDFViewer width="100%" height="100%" style={{ border: "none" }}>
              <PosShiftReportPdf
                sales={reportData.data}
                shift={selectedShift}
                userName={reportData.data[0]?.user_name || undefined}
                settings={settings}
              />
            </PDFViewer>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SalesReportPage;
