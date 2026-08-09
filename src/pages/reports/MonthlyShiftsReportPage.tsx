import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Paper,
  Divider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CalendarDays,
  ChevronDown,
  BarChart2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import apiClient from "@/lib/axios";
import { ShiftFinancialTable } from "@/components/sales/ShiftFinancialTable";
import { uploadFileToFirebase } from "@/services/firebaseStorage";
import { saveShiftToFirestore } from "@/services/firebaseStore";
import { useSettings } from "@/context/SettingsContext";
import { toast } from "sonner";
import { CloudUpload as CloudUploadIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ShiftSummary {
  id: number;
  user_name: string;
  opened_at: string;
  closed_at: string | null;
  is_open: boolean;
}

// grouped: { "2026-02-01": [ShiftSummary, ...], ... }
type GroupedShifts = Record<string, ShiftSummary[]>;

function getDaysInMonth(year: number, month: number): string[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

const MonthlyShiftsReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports"]);
  const monthNames = t("reports:monthlyExpensesPage.months", { returnObjects: true }) as string[];
  const weekdayNames = t("reports:monthlyShiftsReportPage.weekdays", { returnObjects: true }) as string[];
  const dateLocale = i18n.language === "ar" ? "ar-EG" : "en-US";

  const formatDateLocalized = (dateStr: string): string => {
    const d = new Date(dateStr);
    const weekday = weekdayNames[d.getDay()];
    const monthLabel = monthNames[d.getMonth()];
    return `${weekday}${t("reports:monthlyShiftsReportPage.dateSeparator")} ${d.getDate()} ${monthLabel} ${d.getFullYear()}`;
  };

  const formatTime = (isoStr: string | null | undefined): string => {
    if (!isoStr) return "—";
    return new Date(isoStr).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [grouped, setGrouped] = useState<GroupedShifts>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Expanded state per day-key
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  // Expanded state per shift-id
  const [expandedShift, setExpandedShift] = useState<number | null>(null);

  const { getSetting } = useSettings();
  const firebaseCollectionName = getSetting(
    "firebase_collection_name",
    "none",
  );
  const [uploadingShiftId, setUploadingShiftId] = useState<number | null>(null);

  const handleUploadToFirebase = async (
    e: React.MouseEvent,
    shift: ShiftSummary,
  ) => {
    e.stopPropagation();
    if (uploadingShiftId) return;

    const toastId = toast.loading(
      t("reports:monthlyShiftsReportPage.preparingShiftReports", { id: shift.id }),
    );
    setUploadingShiftId(shift.id);

    try {
      // 1. Fetch full shift info to get user_id and stats
      const res = await apiClient.get(`/shifts/${shift.id}`);
      const fullShift = res.data?.data;
      const stats = fullShift?.stats;
      const userId = fullShift?.user_id || 0;

      // 2. Download PDFs
      const [mainRes, costRes, soldItemsRes, returnsRes] =
        await Promise.allSettled([
          apiClient.get(`/reports/sales-pdf?shift_id=${shift.id}`, {
            responseType: "blob",
          }),
          apiClient.get(`/reports/shift-cost-pdf?shift_id=${shift.id}`, {
            responseType: "blob",
          }),
          apiClient.get(`/reports/shift-sold-items-pdf?shift_id=${shift.id}`, {
            responseType: "blob",
          }),
          apiClient.get(`/reports/shift-returns-pdf?shift_id=${shift.id}`, {
            responseType: "blob",
          }),
        ]);

      const getBlob = (result: PromiseSettledResult<unknown>) =>
        result.status === "fulfilled"
          ? new Blob(
              [(result as PromiseFulfilledResult<{ data: Blob }>).value.data],
              { type: "application/pdf" },
            )
          : null;

      const mainBlob = getBlob(mainRes);
      const costBlob = getBlob(costRes);
      const soldItemsBlob = getBlob(soldItemsRes);
      const returnsBlob = getBlob(returnsRes);

      if (!mainBlob) throw new Error(t("reports:monthlyShiftsReportPage.mainSalesReportFailed"));

      const basePath = `pharmacies/${firebaseCollectionName}/shifts/${shift.id}`;
      const urls: {
        mainUrl?: string;
        costUrl?: string;
        soldItemsUrl?: string;
        returnsUrl?: string;
      } = {};

      toast.loading(t("reports:monthlyShiftsReportPage.uploadingSales"), { id: toastId });
      urls.mainUrl = await uploadFileToFirebase(
        mainBlob,
        `${basePath}/shift_report.pdf`,
      );

      if (costBlob) {
        toast.loading(
          t("reports:monthlyShiftsReportPage.salesUploadedUploadingExpenses"),
          { id: toastId },
        );
        urls.costUrl = await uploadFileToFirebase(
          costBlob,
          `${basePath}/cost_report.pdf`,
        );
      }

      if (soldItemsBlob) {
        toast.loading(
          t("reports:monthlyShiftsReportPage.expensesUploadedUploadingSoldItems"),
          { id: toastId },
        );
        urls.soldItemsUrl = await uploadFileToFirebase(
          soldItemsBlob,
          `${basePath}/sold_items_report.pdf`,
        );
      }

      if (returnsBlob) {
        toast.loading(
          t("reports:monthlyShiftsReportPage.soldItemsUploadedUploadingReturns"),
          { id: toastId },
        );
        urls.returnsUrl = await uploadFileToFirebase(
          returnsBlob,
          `${basePath}/returns_report.pdf`,
        );
      }

      toast.loading(t("reports:monthlyShiftsReportPage.savingToFirestore"), { id: toastId });

      await saveShiftToFirestore(
        {
          shift_id: shift.id,
          user_id: userId,
          user_name: shift.user_name,
          opened_at: shift.opened_at,
          closed_at: shift.closed_at ?? undefined,
          pdf_url: urls.mainUrl ?? "",
          cost_pdf_url: urls.costUrl,
          sold_items_pdf_url: urls.soldItemsUrl,
          returns_pdf_url: urls.returnsUrl,
          stats: stats,
        },
        firebaseCollectionName,
      );

      toast.loading(t("reports:monthlyShiftsReportPage.sendingCloseNotifications"), { id: toastId });
      const notifyRes = await apiClient.post(`/shifts/${shift.id}/notify`);
      const notifyData = notifyRes.data;

      if (notifyData?.whatsapp_status === "success") {
        toast.success(
          t("reports:monthlyShiftsReportPage.allUploadedWhatsAppSuccess"),
          {
            id: toastId,
            duration: 5000,
          },
        );
      } else if (notifyData?.whatsapp_status === "failed") {
        toast.warning(t("reports:monthlyShiftsReportPage.uploadedWhatsAppFailed"), {
          id: toastId,
          description: notifyData.whatsapp_message || t("reports:monthlyShiftsReportPage.unknownError"),
          duration: 8000,
        });
      } else {
        toast.success(t("reports:monthlyShiftsReportPage.allUploadedSuccess"), {
          id: toastId,
          duration: 5000,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : t("reports:monthlyShiftsReportPage.unknownErrorOccurred");
      toast.error(t("reports:monthlyShiftsReportPage.uploadFailed", { error: errorMessage }), {
        id: toastId,
        duration: 5000,
      });
    } finally {
      setUploadingShiftId(null);
    }
  };

  const allDays = useMemo(() => getDaysInMonth(year, month), [year, month]);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get("/shifts/by-month", {
          params: { year, month },
        });
        if (mounted) setGrouped(res.data?.data ?? {});
      } catch {
        if (mounted) setError(t("reports:monthlyShiftsReportPage.fetchShiftsFailed"));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const totalShifts = Object.values(grouped).reduce((s, d) => s + d.length, 0);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: "auto" }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #1976d2 0%, #512da8 100%)",
          color: "#fff",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Stack direction="row" alignItems="center" gap={1.5}>
            <BarChart2 size={28} />
            <Box>
              <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
                {t("reports:monthlyShiftsReportPage.title")}
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {t("reports:monthlyShiftsReportPage.totalShifts", { count: totalShifts })}
              </Typography>
            </Box>
          </Stack>

          {/* Month Navigator */}
          <Stack direction="row" alignItems="center" gap={1}>
            <Tooltip title={t("reports:monthlyShiftsReportPage.nextMonthTooltip")}>
              <IconButton
                size="small"
                onClick={nextMonth}
                sx={{ color: "#fff" }}
              >
                {i18n.dir() === "rtl" ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
              </IconButton>
            </Tooltip>
            <Typography
              fontWeight={700}
              sx={{
                px: 2,
                py: 0.5,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.15)",
                minWidth: 130,
                textAlign: "center",
              }}
            >
              {monthNames[month - 1]} {year}
            </Typography>
            <Tooltip title={t("reports:monthlyShiftsReportPage.previousMonthTooltip")}>
              <IconButton
                size="small"
                onClick={prevMonth}
                sx={{ color: "#fff" }}
              >
                {i18n.dir() === "rtl" ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>

      {/* Content */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" textAlign="center" py={4}>
          {error}
        </Typography>
      )}

      {!loading && !error && (
        <Stack gap={1.5}>
          {allDays.map((dayStr) => {
            const shifts = grouped[dayStr] ?? [];
            const hasShifts = shifts.length > 0;
            const isExpanded = expandedDay === dayStr;

            return (
              <Accordion
                key={dayStr}
                expanded={hasShifts && isExpanded}
                onChange={() => {
                  if (!hasShifts) return;
                  setExpandedDay(isExpanded ? null : dayStr);
                  setExpandedShift(null);
                }}
                elevation={0}
                disableGutters
                sx={{
                  border: "1px solid",
                  borderColor: hasShifts ? "primary.light" : "divider",
                  borderRadius: "12px !important",
                  overflow: "hidden",
                  opacity: hasShifts ? 1 : 0.55,
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary
                  expandIcon={hasShifts ? <ChevronDown size={18} /> : null}
                  sx={{
                    bgcolor: hasShifts ? "primary.50" : "grey.50",
                    px: 2.5,
                    py: 1,
                    "& .MuiAccordionSummary-content": { my: 0 },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                    gap={1}
                  >
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <CalendarDays
                        size={18}
                        color={hasShifts ? "#1976d2" : "#9e9e9e"}
                      />
                      <Typography fontWeight={600} fontSize={15}>
                        {formatDateLocalized(dayStr)}
                      </Typography>
                    </Stack>
                    {hasShifts ? (
                      <Chip
                        label={t("reports:monthlyShiftsReportPage.shiftsCountChip", { count: shifts.length })}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        label={t("reports:monthlyShiftsReportPage.noShiftsChip")}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                </AccordionSummary>

                {hasShifts && (
                  <AccordionDetails sx={{ p: 0 }}>
                    {shifts.map((shift, idx) => (
                      <Box key={shift.id}>
                        {idx > 0 && <Divider />}
                        {/* Shift Sub-Accordion */}
                        <Accordion
                          expanded={expandedShift === shift.id}
                          onChange={() =>
                            setExpandedShift(
                              expandedShift === shift.id ? null : shift.id,
                            )
                          }
                          elevation={0}
                          disableGutters
                          sx={{ "&:before": { display: "none" } }}
                        >
                          <AccordionSummary
                            expandIcon={<ChevronDown size={16} />}
                            sx={{
                              px: 2.5,
                              py: 0.5,
                              bgcolor: "background.paper",
                            }}
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              width="100%"
                              gap={1}
                              flexWrap="wrap"
                            >
                              <Stack
                                direction="row"
                                alignItems="center"
                                gap={1}
                              >
                                <Typography fontWeight={600} variant="body2">
                                  {t("reports:monthlyShiftsReportPage.shiftHash", { id: shift.id })}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  — {shift.user_name}
                                </Typography>
                              </Stack>
                              <Stack
                                direction="row"
                                gap={1}
                                alignItems="center"
                              >
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  {t("reports:monthlyShiftsReportPage.openedLabel", { time: formatTime(shift.opened_at) })}
                                </Typography>
                                {shift.closed_at ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {t("reports:monthlyShiftsReportPage.closedLabel", { time: formatTime(shift.closed_at) })}
                                  </Typography>
                                ) : (
                                  <Chip
                                    label={t("reports:monthlyShiftsReportPage.openChip")}
                                    size="small"
                                    color="success"
                                  />
                                )}
                                <Tooltip title={t("reports:monthlyShiftsReportPage.uploadToFirebaseTooltip")}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      disabled={uploadingShiftId === shift.id}
                                      onClick={(e) =>
                                        handleUploadToFirebase(e, shift)
                                      }
                                      sx={{
                                        ml: 1,
                                        bgcolor: "primary.50",
                                        width: 28,
                                        height: 28,
                                      }}
                                    >
                                      {uploadingShiftId === shift.id ? (
                                        <CircularProgress size={16} />
                                      ) : (
                                        <CloudUploadIcon size={16} />
                                      )}
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </Stack>
                          </AccordionSummary>
                          <AccordionDetails sx={{ p: 0, bgcolor: "grey.50" }}>
                            <ShiftFinancialTable shiftId={shift.id} />
                          </AccordionDetails>
                        </Accordion>
                      </Box>
                    ))}
                  </AccordionDetails>
                )}
              </Accordion>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default MonthlyShiftsReportPage;
