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

interface ShiftSummary {
  id: number;
  user_name: string;
  opened_at: string;
  closed_at: string | null;
  is_open: boolean;
}

// grouped: { "2026-02-01": [ShiftSummary, ...], ... }
type GroupedShifts = Record<string, ShiftSummary[]>;

const ARABIC_MONTHS = [
  "",
  "يناير",
  "فبراير",
  "مارس",
  "إبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const ARABIC_WEEKDAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function getDaysInMonth(year: number, month: number): string[] {
  const count = new Date(year, month, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  });
}

function formatDateAr(dateStr: string): string {
  const d = new Date(dateStr);
  const weekday = ARABIC_WEEKDAYS[d.getDay()];
  return `${weekday}، ${d.getDate()} ${ARABIC_MONTHS[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return "—";
  return new Date(isoStr).toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

const MonthlyShiftsReportPage: React.FC = () => {
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
    "one_care",
  );
  const [uploadingShiftId, setUploadingShiftId] = useState<number | null>(null);

  const handleUploadToFirebase = async (
    e: React.MouseEvent,
    shift: ShiftSummary,
  ) => {
    e.stopPropagation();
    if (uploadingShiftId) return;

    const toastId = toast.loading(
      `⏳ جاري تحضير تقارير الوردية #${shift.id}...`,
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

      if (!mainBlob) throw new Error("فشل في تحميل تقرير المبيعات الأساسي");

      const basePath = `pharmacies/${firebaseCollectionName}/shifts/${shift.id}`;
      const urls: {
        mainUrl?: string;
        costUrl?: string;
        soldItemsUrl?: string;
        returnsUrl?: string;
      } = {};

      toast.loading("📊 جاري رفع تقرير المبيعات (1/4)...", { id: toastId });
      urls.mainUrl = await uploadFileToFirebase(
        mainBlob,
        `${basePath}/shift_report.pdf`,
      );

      if (costBlob) {
        toast.loading(
          "✅ تقرير المبيعات — تم | ⏳ جاري رفع تقرير المصروفات (2/4)...",
          { id: toastId },
        );
        urls.costUrl = await uploadFileToFirebase(
          costBlob,
          `${basePath}/cost_report.pdf`,
        );
      }

      if (soldItemsBlob) {
        toast.loading(
          "✅ تقرير المصروفات — تم | ⏳ جاري رفع الأصناف المباعة (3/4)...",
          { id: toastId },
        );
        urls.soldItemsUrl = await uploadFileToFirebase(
          soldItemsBlob,
          `${basePath}/sold_items_report.pdf`,
        );
      }

      if (returnsBlob) {
        toast.loading(
          "✅ الأصناف المباعة — تم | ⏳ جاري رفع المردودات (4/4)...",
          { id: toastId },
        );
        urls.returnsUrl = await uploadFileToFirebase(
          returnsBlob,
          `${basePath}/returns_report.pdf`,
        );
      }

      toast.loading("☁️ جاري حفظ البيانات في Firestore...", { id: toastId });

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

      toast.loading("📱 جاري إرسال إشعارات الإغلاق...", { id: toastId });
      const notifyRes = await apiClient.post(`/shifts/${shift.id}/notify`);
      const notifyData = notifyRes.data;

      if (notifyData?.whatsapp_status === "success") {
        toast.success(
          "✅ تم رفع التقارير، حفظ البيانات، وإرسال الواتساب بنجاح!",
          {
            id: toastId,
            duration: 5000,
          },
        );
      } else if (notifyData?.whatsapp_status === "failed") {
        toast.warning("⚠️ تم رفع التقارير، لكن فشل إرسال الواتساب", {
          id: toastId,
          description: notifyData.whatsapp_message || "خطأ غير معروف",
          duration: 8000,
        });
      } else {
        toast.success("✅ تم رفع جميع التقارير وحفظ بيانات الوردية بنجاح!", {
          id: toastId,
          duration: 5000,
        });
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير معروف";
      toast.error(`⚠️ فشل الرفع: ${errorMessage}`, {
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
        if (mounted) setError("فشل في جلب بيانات الورديات");
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
                تقرير الورديات الشهري
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                إجمالي الورديات: {totalShifts}
              </Typography>
            </Box>
          </Stack>

          {/* Month Navigator */}
          <Stack direction="row" alignItems="center" gap={1}>
            <Tooltip title="الشهر التالي">
              <IconButton
                size="small"
                onClick={nextMonth}
                sx={{ color: "#fff" }}
              >
                <ArrowLeft size={20} />
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
              {ARABIC_MONTHS[month]} {year}
            </Typography>
            <Tooltip title="الشهر السابق">
              <IconButton
                size="small"
                onClick={prevMonth}
                sx={{ color: "#fff" }}
              >
                <ArrowRight size={20} />
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
                        {formatDateAr(dayStr)}
                      </Typography>
                    </Stack>
                    {hasShifts ? (
                      <Chip
                        label={`${shifts.length} وردية`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        label="لا توجد ورديات"
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
                                  وردية #{shift.id}
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
                                  فتح: {formatTime(shift.opened_at)}
                                </Typography>
                                {shift.closed_at ? (
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    · إغلاق: {formatTime(shift.closed_at)}
                                  </Typography>
                                ) : (
                                  <Chip
                                    label="مفتوحة"
                                    size="small"
                                    color="success"
                                  />
                                )}
                                <Tooltip title="رفع إلى Firebase">
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
