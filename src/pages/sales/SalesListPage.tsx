// src/pages/sales/SalesListPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { format, startOfMonth, startOfWeek, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  App as AntApp,
  Alert,
  Button,
  Card,
  Checkbox,
  ConfigProvider,
  DatePicker,
  Empty,
  Flex,
  Input,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  theme as antdTheme,
} from "antd";
import type { TableProps } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import {
  CheckCircle2,
  Columns3,
  Eye,
  FileSpreadsheet,
  Filter,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  User,
} from "lucide-react";

import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useSettings } from "@/context/SettingsContext";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useShifts } from "@/hooks/useShifts";
import { webUrl } from "@/constants";
import apiClient from "@/lib/axios";

import saleService, { Sale } from "@/services/saleService";
import saleReturnService, { SaleReturn } from "@/services/saleReturnService";
import clientService, { PaginatedResponse } from "@/services/clientService";
import { getSaleStatus, translateSaleStatus, type SaleStatusInfo } from "@/lib/saleStatus";
import { SaleDetailsDialog } from "@/components/sales/SaleDetailsDialog";

interface SalesAdvancedFilterValues {
  clientId: string;
  clientName: string;
  userId: string;
  shiftId: string;
}

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PER_PAGE_OPTIONS = [25, 50, 100];
const RETURNS_PER_PAGE = 10;

const RETURN_METHOD_COLORS: Record<string, string> = {
  cash: "green",
  bankak: "blue",
  fawry: "gold",
  ocash: "default",
  bank_transfer: "blue",
  card: "geekblue",
};

const saleReturnTotal = (r: SaleReturn) =>
  r.items?.reduce((acc, item) => acc + Number(item.price) * Number(item.quantity), 0) ?? 0;

type DatePreset = "today" | "yesterday" | "week" | "month" | "custom" | "all";

const DATE_PRESET_KEYS: Record<DatePreset, string> = {
  today: "datePresetToday",
  yesterday: "datePresetYesterday",
  week: "datePresetWeek",
  month: "datePresetMonth",
  custom: "datePresetCustom",
  all: "datePresetAll",
};

const STATUS_TAG_COLOR: Record<SaleStatusInfo["variant"], string> = {
  success: "green",
  warning: "orange",
  destructive: "red",
  secondary: "default",
  outline: "blue",
};

// Column visibility (persisted in localStorage, same UX as the products page).
const COLUMN_KEYS = [
  "id",
  "date",
  "client",
  "cashier",
  "total",
  "cost",
  "paid",
  "status",
  "finance",
] as const;
type ColumnKey = (typeof COLUMN_KEYS)[number];
const COLUMN_LABEL_KEYS: Record<ColumnKey, string> = {
  id: "invoiceColumn",
  date: "date",
  client: "client",
  cashier: "cashierColumn",
  total: "totalColumn",
  cost: "costColumn",
  paid: "paidColumn",
  status: "status",
  finance: "financeColumn",
};
const COLUMNS_STORAGE_KEY = "sales_table_columns";
const DEFAULT_COLUMN_VISIBILITY = COLUMN_KEYS.reduce(
  (acc, key) => ({ ...acc, [key]: true }),
  {} as Record<ColumnKey, boolean>,
);

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function resolveDateRange(preset: DatePreset, custom: DateRange | undefined) {
  const today = new Date();
  switch (preset) {
    case "today":
      return { start: fmt(today), end: fmt(today) };
    case "yesterday": {
      const y = subDays(today, 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case "week":
      return { start: fmt(startOfWeek(today)), end: fmt(today) };
    case "month":
      return { start: fmt(startOfMonth(today)), end: fmt(today) };
    case "custom":
      return {
        start: custom?.from ? fmt(custom.from) : undefined,
        end: custom?.to ? fmt(custom.to) : undefined,
      };
    case "all":
    default:
      return { start: undefined, end: undefined };
  }
}

const EMPTY_ADVANCED: SalesAdvancedFilterValues = { clientId: "", clientName: "", userId: "", shiftId: "" };

const SalesListPage: React.FC = () => {
  const navigate = useNavigate();
  const formatCurrency = useFormatCurrency();
  const { getSetting } = useSettings();
  const { hasPermission } = useAuthorization();
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");
  const posMode = (getSetting("pos_mode", "shift") as "shift" | "days") ?? "shift";
  const canCreateSale = hasPermission("view-pos");

  const [searchParams, setSearchParams] = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [datePreset, setDatePreset] = useState<DatePreset>(
    (searchParams.get("preset") as DatePreset) || "today"
  );
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [advanced, setAdvanced] = useState<SalesAdvancedFilterValues>({
    clientId: searchParams.get("clientId") ?? "",
    clientName: searchParams.get("clientName") ?? "",
    userId: searchParams.get("userId") ?? "",
    shiftId: searchParams.get("shiftId") ?? "",
  });
  const [page, setPage] = useState(Number(searchParams.get("page") || "1"));
  const [perPage, setPerPage] = useState(25);
  const [returnsPage, setReturnsPage] = useState(1);

  const [clientSearch, setClientSearch] = useState("");
  const [debouncedClientSearch, setDebouncedClientSearch] = useState("");

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
      return saved ? { ...DEFAULT_COLUMN_VISIBILITY, ...JSON.parse(saved) } : DEFAULT_COLUMN_VISIBILITY;
    } catch {
      return DEFAULT_COLUMN_VISIBILITY;
    }
  });
  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore persistence failures */
      }
      return next;
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedClientSearch(clientSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  useEffect(() => {
    setPage(1);
    setReturnsPage(1);
  }, [debouncedSearch, datePreset, customRange, advanced]);

  // Keep the URL shareable/refreshable.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedSearch) next.set("search", debouncedSearch);
    next.set("preset", datePreset);
    if (advanced.clientId) {
      next.set("clientId", advanced.clientId);
      if (advanced.clientName) next.set("clientName", advanced.clientName);
    }
    if (advanced.userId) next.set("userId", advanced.userId);
    if (advanced.shiftId) next.set("shiftId", advanced.shiftId);
    next.set("page", String(page));
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, datePreset, advanced, page]);

  const dateRange = useMemo(() => resolveDateRange(datePreset, customRange), [datePreset, customRange]);

  const filterQs = useMemo(() => {
    const qs = new URLSearchParams();
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (dateRange.start) qs.set("start_date", dateRange.start);
    if (dateRange.end) qs.set("end_date", dateRange.end);
    if (advanced.clientId) qs.set("client_id", advanced.clientId);
    if (advanced.userId) qs.set("user_id", advanced.userId);
    if (advanced.shiftId) qs.set("shift_id", advanced.shiftId);
    return qs.toString();
  }, [debouncedSearch, dateRange, advanced]);

  const salesQuery = useQuery({
    queryKey: ["sales-list", page, perPage, filterQs],
    queryFn: () => saleService.getSales(page, filterQs, "", "", "", perPage),
    placeholderData: keepPreviousData,
  });

  // Totals across every sale matching the current filters, not just the visible page.
  const summaryQuery = useQuery({
    queryKey: ["sales-summary", filterQs],
    queryFn: () => saleService.getSalesSummary(filterQs),
    placeholderData: keepPreviousData,
  });

  const sales = salesQuery.data?.data ?? [];

  // Sale returns matching the same shift/date/cashier filters as the sales list — the
  // search/client filters don't apply here since a return isn't tied to those directly.
  const saleReturnsQuery = useQuery({
    queryKey: ["sales-list-returns", returnsPage, advanced.shiftId, advanced.userId, dateRange.start, dateRange.end],
    queryFn: () =>
      saleReturnService.getSaleReturns({
        page: returnsPage,
        per_page: RETURNS_PER_PAGE,
        shift_id: advanced.shiftId ? Number(advanced.shiftId) : null,
        user_id: advanced.userId ? Number(advanced.userId) : null,
        start_date: dateRange.start,
        end_date: dateRange.end,
      }),
    placeholderData: keepPreviousData,
  });
  const saleReturns = saleReturnsQuery.data?.data ?? [];
  const saleReturnsMeta = saleReturnsQuery.data?.meta ?? {};

  // Inline advanced-filter option sources.
  const usersQuery = useQuery({
    queryKey: ["users-list-filters"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: number; name: string }[] }>("/users/list");
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const shiftsQuery = useShifts();
  const clientResultsQuery = useQuery({
    queryKey: ["sales-filter-clients", debouncedClientSearch],
    queryFn: () => clientService.autocompleteClients(debouncedClientSearch, 20),
    enabled: debouncedClientSearch.length > 0,
    placeholderData: keepPreviousData,
  });

  const clientOptions = useMemo(() => {
    const opts = (clientResultsQuery.data ?? []).map((c) => ({ value: String(c.id), label: c.name }));
    // Keep the current selection visible even when it isn't in the latest search results.
    if (advanced.clientId && !opts.some((o) => o.value === advanced.clientId)) {
      opts.unshift({
        value: advanced.clientId,
        label: advanced.clientName || t("clientHash", { id: advanced.clientId }),
      });
    }
    return opts;
  }, [clientResultsQuery.data, advanced.clientId, advanced.clientName, t]);

  // After each fetch, re-check the visible page's "exported to finance" sales against
  // Firestore — if an entry was deleted on finance-api's side, clear finance_exported_at
  // here too so the checkmark disappears instead of staying stuck from stale server data.
  const queryClient = useQueryClient();
  const lastVerifiedSignatureRef = useRef<string>("");
  useEffect(() => {
    const exportedIds = sales
      .filter((s) => !!s.finance_exported_at)
      .map((s) => s.id)
      .sort((a, b) => a - b);

    if (exportedIds.length === 0) return;

    const signature = exportedIds.join(",");
    if (signature === lastVerifiedSignatureRef.current) return;
    lastVerifiedSignatureRef.current = signature;

    saleService.verifyFinanceExports(exportedIds).then((removedIds) => {
      if (removedIds.length === 0) return;
      const removedSet = new Set(removedIds);
      queryClient.setQueryData<PaginatedResponse<Sale> | undefined>(
        ["sales-list", page, perPage, filterQs],
        (old) =>
          old && {
            ...old,
            data: old.data.map((s) =>
              removedSet.has(s.id) ? { ...s, finance_exported_at: null, finance_export_error: null } : s,
            ),
          },
      );
    }).catch(() => {
      // Background reconciliation only — a failed check just leaves stale state for next fetch.
    });
  }, [sales, page, perPage, filterQs, queryClient]);

  const hasActiveFilters =
    debouncedSearch !== "" || datePreset !== "today" || !!advanced.clientId || !!advanced.userId || !!advanced.shiftId;

  const refetchAll = () => {
    salesQuery.refetch();
    summaryQuery.refetch();
    saleReturnsQuery.refetch();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDatePreset("today");
    setCustomRange(undefined);
    setAdvanced(EMPTY_ADVANCED);
  };

  const openSale = (id: number) => {
    setSelectedSaleId(id);
    setDrawerOpen(true);
  };

  const buildExportParams = () => {
    const params = new URLSearchParams();
    if (dateRange.start) params.append("start_date", dateRange.start);
    if (dateRange.end) params.append("end_date", dateRange.end);
    if (advanced.clientId) params.append("client_id", advanced.clientId);
    if (advanced.userId) params.append("user_id", advanced.userId);
    if (advanced.shiftId) params.append("shift_id", advanced.shiftId);
    if (debouncedSearch) params.append("search", debouncedSearch);
    return params;
  };

  const handleExport = () => {
    window.open(`${webUrl}/reports/sales/pdf?${buildExportParams().toString()}`, "_blank");
  };

  const handleExportExcel = () => {
    window.open(`${webUrl}/reports/sales/excel?${buildExportParams().toString()}`, "_blank");
  };

  const locale = language === "ar" ? "ar" : "en-US";

  const RETURN_METHOD_LABELS: Record<string, string> = {
    cash: t("paymentMethodCash"),
    bankak: t("paymentMethodBankak"),
    fawry: t("paymentMethodFawry"),
    ocash: t("paymentMethodOcash"),
    bank_transfer: t("paymentMethodBankTransfer"),
    card: t("paymentMethodCard"),
  };

  const returnColumns: TableProps<SaleReturn>["columns"] = [
    {
      title: t("date"),
      dataIndex: "created_at",
      key: "date",
      width: 110,
      render: (value: string | null) =>
        value ? (
          <Tooltip
            title={new Date(value).toLocaleString(locale, {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          >
            <Text style={{ fontSize: 12 }}>
              {new Date(value).toLocaleDateString(locale, { day: "2-digit", month: "short" })}
            </Text>
          </Tooltip>
        ) : (
          "—"
        ),
    },
    {
      title: t("invoiceHashColumn"),
      dataIndex: "sale_id",
      key: "sale_id",
      width: 90,
      render: (saleId: number | null) =>
        saleId != null ? (
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontWeight: 600 }}
            onClick={(e) => {
              e.stopPropagation();
              openSale(saleId);
            }}
          >
            #{saleId}
          </Button>
        ) : (
          "—"
        ),
    },
    {
      title: t("phoneNumberColumn"),
      dataIndex: "phone_number",
      key: "phone_number",
      width: 130,
      render: (phone: string | null) => <span dir="ltr">{phone ?? "—"}</span>,
    },
    {
      title: t("cashierColumn"),
      key: "user",
      width: 130,
      render: (_v, r) => <Text type="secondary">{r.user?.name ?? "—"}</Text>,
    },
    {
      title: t("reasonColumn"),
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (reason: string | null) => reason ?? "—",
    },
    {
      title: t("returnMethodColumn"),
      dataIndex: "returned_payment_method",
      key: "method",
      align: "center",
      width: 130,
      render: (method: string) => (
        <Tag color={RETURN_METHOD_COLORS[method] ?? "default"}>
          {RETURN_METHOD_LABELS[method] ?? method ?? "—"}
        </Tag>
      ),
    },
    {
      title: t("itemsColumnShort"),
      key: "items",
      align: "center",
      width: 70,
      render: (_v, r) => <Tag>{r.items?.length ?? 0}</Tag>,
    },
    {
      title: t("totalColumn"),
      key: "total",
      align: "right",
      width: 120,
      render: (_v, r) => (
        <Text strong type="danger">
          {formatCurrency(saleReturnTotal(r))}
        </Text>
      ),
    },
  ];

  const columns: TableProps<Sale>["columns"] = [
    {
      title: t("invoiceColumn"),
      dataIndex: "id",
      key: "id",
      width: 100,
      render: (id: number, sale) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            style={{ padding: 0, fontWeight: 600 }}
            onClick={(e) => {
              e.stopPropagation();
              openSale(id);
            }}
          >
            #{id}
          </Button>
          {sale.is_returned && (
            <Tooltip title={t("hasReturns")}>
              <RotateCcw size={13} style={{ color: "#dc2626" }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: t("date"),
      dataIndex: "sale_date",
      key: "date",
      width: 120,
      render: (_v, sale) => (
        <Tooltip
          title={`${t("createdAtLabel")}: ${new Date(sale.created_at).toLocaleString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`}
        >
          <Text style={{ fontWeight: 500 }}>
            {new Date(sale.sale_date).toLocaleDateString(locale, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: t("client"),
      dataIndex: "client_name",
      key: "client",
      render: (_v, sale) =>
        sale.client_id ? (
          <Space size={4}>
            <User size={14} style={{ opacity: 0.5 }} />
            <Text style={{ fontWeight: 500 }}>
              {sale.client_name ?? t("clientHash", { id: sale.client_id })}
            </Text>
          </Space>
        ) : (
          <Text type="secondary">{t("cashClient")}</Text>
        ),
    },
       {
      title: t("cashierColumn"),
      dataIndex: "user_name",
      key: "cashier",
      width: 130,
      render: (name: string | null) => <Text >{name ?? "—"}</Text>,
    },
    {
      title: t("totalColumn"),
      dataIndex: "total_amount",
      key: "total",
      align: "right",
      width: 120,
      render: (v) => <Text strong>{formatCurrency(Number(v ?? 0))}</Text>,
    },
    {
      title: t("costColumn"),
      dataIndex: "total_cost",
      key: "cost",
      align: "right",
      width: 120,
      render: (v) => <Text >{formatCurrency(Number(v ?? 0))}</Text>,
    },
    {
      title: t("paidColumn"),
      dataIndex: "paid_amount",
      key: "paid",
      align: "right",
      width: 120,
      render: (v) => (
        <span style={{ color: "#16a34a" ,fontWeight: 700}}>{formatCurrency(Number(v ?? 0))}</span>
      ),
    },
    {
      title: t("status"),
      key: "status",
      width: 120,
      render: (_v, sale) => {
        const status = getSaleStatus(sale);
        return <Tag color={STATUS_TAG_COLOR[status.variant]}>{translateSaleStatus(t, status.kind)}</Tag>;
      },
    },
 
    {
      title: t("financeColumn"),
      key: "finance",
      align: "center",
      width: 90,
      render: (_v, sale) => <FinanceExportButton sale={sale} />,
    },
  ];

  const displayedColumns = (columns ?? []).filter(
    (c) => visibleColumns[c.key as ColumnKey] ?? true,
  );

  const columnToggleContent = (
    <Space direction="vertical" size={4} style={{ minWidth: 180 }}>
      <Text strong>{t("visibleColumnsTitle")}</Text>
      {COLUMN_KEYS.map((key) => (
        <Checkbox
          key={key}
          checked={visibleColumns[key] ?? true}
          disabled={key === "id"}
          onChange={() => toggleColumn(key)}
        >
          {t(COLUMN_LABEL_KEYS[key])}
        </Checkbox>
      ))}
    </Space>
  );

  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <Space direction="vertical" size={8}>
          <Text style={{ fontWeight: 500 }}>{t("emptyTitle")}</Text>
          <Text >
            {hasActiveFilters ? t("emptyDescriptionFiltered") : t("emptyDescriptionNoFilter")}
          </Text>
          <Space wrap>
            {hasActiveFilters && (
              <Button size="small" onClick={clearFilters}>
                {t("clearFiltersButton")}
              </Button>
            )}
            {datePreset !== "all" && (
              <Button size="small" onClick={() => setDatePreset("all")}>
                {t("showAllDates")}
              </Button>
            )}
            {canCreateSale && (
              <Button size="small" type="primary" icon={<Plus size={14} />} onClick={() => navigate("/sales/pos")}>
                {t("newSale")}
              </Button>
            )}
          </Space>
        </Space>
      }
    />
  );

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={{
        algorithm: resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      <AntApp>
        <div dir={direction} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <Flex align="flex-start" justify="space-between" gap={16} wrap>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {t("pageTitle")}
              </Title>
              <Text type="secondary">{t("pageSubtitle")}</Text>
            </div>
            <Space wrap>
              <Tooltip title={tCommon("refresh")}>
                <Button
                  icon={<RefreshCw size={16} className={salesQuery.isFetching ? "animate-spin" : ""} />}
                  onClick={refetchAll}
                />
              </Tooltip>
              <Popover
                trigger="click"
                placement="bottomRight"
                content={columnToggleContent}
              >
                <Tooltip title={t("toggleColumnsTooltip")}>
                  <Button icon={<Columns3 size={16} />}>{t("columnsLabel")}</Button>
                </Tooltip>
              </Popover>
              <Button icon={<Eye size={16} />} onClick={handleExport}>
                {t("export")}
              </Button>
              <Button icon={<FileSpreadsheet size={16} />} onClick={handleExportExcel}>
                {t("exportExcel")}
              </Button>
              {canCreateSale && (
                <Button type="primary" icon={<Plus size={16} />} onClick={() => navigate("/sales/pos")}>
                  {t("newSale")}
                </Button>
              )}
            </Space>
          </Flex>

          {/* Filters */}
          <Card size="small">
            <Flex gap={12} wrap align="center">
              <Input
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("searchPlaceholder")}
                prefix={<Search size={15} style={{ opacity: 0.5 }} />}
                style={{ width: 260 }}
              />

              <Select<DatePreset>
                value={datePreset}
                style={{ width: 160 }}
                onChange={(v) => {
                  setDatePreset(v);
                  setAdvanced((p) => ({ ...p, shiftId: "" }));
                }}
                options={(Object.keys(DATE_PRESET_KEYS) as DatePreset[]).map((p) => ({
                  value: p,
                  label: t(DATE_PRESET_KEYS[p]),
                }))}
              />

              {datePreset === "custom" && (
                <RangePicker
                  value={
                    customRange?.from && customRange?.to
                      ? [dayjs(customRange.from), dayjs(customRange.to)]
                      : null
                  }
                  onChange={(values) =>
                    setCustomRange(
                      values?.[0] && values?.[1]
                        ? { from: values[0].toDate(), to: values[1].toDate() }
                        : undefined,
                    )
                  }
                />
              )}

              <Select
                showSearch
                allowClear
                placeholder={t("client")}
                style={{ width: 200 }}
                value={advanced.clientId || undefined}
                filterOption={false}
                notFoundContent={
                  clientResultsQuery.isFetching
                    ? t("searching")
                    : debouncedClientSearch
                      ? t("noMatchingClients")
                      : t("typeToSearchClient")
                }
                onSearch={setClientSearch}
                onChange={(value, option) =>
                  setAdvanced((p) => ({
                    ...p,
                    clientId: value ?? "",
                    clientName: value ? (option as { label: string })?.label ?? "" : "",
                  }))
                }
                options={clientOptions}
              />

              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={t("allCashiers")}
                style={{ width: 170 }}
                loading={usersQuery.isLoading}
                value={advanced.userId || undefined}
                onChange={(value) => setAdvanced((p) => ({ ...p, userId: value ?? "" }))}
                options={(usersQuery.data ?? []).map((u) => ({ value: String(u.id), label: u.name }))}
              />

              {posMode === "shift" && (
                <Select
                  allowClear
                  placeholder={t("allShifts")}
                  style={{ width: 280 }}
                  loading={shiftsQuery.isLoading}
                  value={advanced.shiftId || undefined}
                  onChange={(value) => setAdvanced((p) => ({ ...p, shiftId: value ?? "" }))}
                  options={(shiftsQuery.data ?? []).map((s) => ({
                    value: String(s.id),
                    label:
                      (s.name ? s.name : t("shiftHashFilter", { id: s.id })) +
                      (s.shift_date ? ` (${s.shift_date})` : ""),
                  }))}
                />
              )}

              {hasActiveFilters && (
                <Button type="text" icon={<Filter size={14} />} onClick={clearFilters}>
                  {t("clearFiltersButton")}
                </Button>
              )}

              <div style={{ flex: 1 }} />

              {!salesQuery.isError && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("salesCount", { count: salesQuery.data?.total ?? sales.length })}
                </Text>
              )}
            </Flex>
          </Card>

          {/* Error */}
          {salesQuery.isError && (
            <Alert
              type="error"
              showIcon
              message={t("loadErrorTitle")}
              description={t("loadErrorDescription")}
              action={
                <Button size="small" onClick={refetchAll}>
                  {tCommon("retry")}
                </Button>
              }
            />
          )}

          {/* Table */}
          {!salesQuery.isError && (
            <Card size="small" styles={{ body: { padding: 0 } }}>
              <Table<Sale>
                rowKey="id"
                size="small"
                columns={displayedColumns}
                dataSource={sales}
                loading={salesQuery.isLoading}
                scroll={{ x: 1100 }}
                locale={{ emptyText: emptyNode }}
                onRow={(sale) => ({
                  onClick: () => openSale(sale.id),
                  style: {
                    cursor: "pointer",
                    backgroundColor: sale.is_returned ? "rgba(220, 38, 38, 0.06)" : undefined,
                  },
                })}
                pagination={{
                  current: page,
                  pageSize: perPage,
                  total: salesQuery.data?.total ?? sales.length,
                  showSizeChanger: true,
                  pageSizeOptions: PER_PAGE_OPTIONS,
                  showTotal: (total, range) =>
                    t("showingRange", {
                      from: range[0].toLocaleString("en-US"),
                      to: range[1].toLocaleString("en-US"),
                      total: total.toLocaleString("en-US"),
                    }),
                }}
                onChange={(pagination) => {
                  if (pagination.pageSize && pagination.pageSize !== perPage) {
                    setPerPage(pagination.pageSize);
                    setPage(1);
                  } else if (pagination.current) {
                    setPage(pagination.current);
                  }
                }}
                summary={() =>
                  sales.length === 0 ? null : (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        {displayedColumns.map((col, i) => {
                          const key = col.key as ColumnKey;
                          let content: React.ReactNode = null;
                          if (i === 0) {
                            content = <Text strong>{t("totalsRowLabel")}</Text>;
                          } else if (key === "total") {
                            content = (
                              <Text strong>{formatCurrency(summaryQuery.data?.total_amount ?? 0)}</Text>
                            );
                          } else if (key === "cost") {
                            content = (
                              <Text type="secondary" strong>
                                {formatCurrency(summaryQuery.data?.total_cost ?? 0)}
                              </Text>
                            );
                          } else if (key === "paid") {
                            content = (
                              <span style={{ color: "#16a34a", fontWeight: 700 }}>
                                {formatCurrency(summaryQuery.data?.paid_amount ?? 0)}
                              </span>
                            );
                          }
                          return (
                            <Table.Summary.Cell
                              key={key}
                              index={i}
                              align={(col.align as "left" | "right" | "center") ?? "left"}
                            >
                              {content}
                            </Table.Summary.Cell>
                          );
                        })}
                      </Table.Summary.Row>

                      {/* Returns (under the paid column) — shows what's being subtracted to reach net, below. */}
                      <Table.Summary.Row>
                        {displayedColumns.map((col, i) => {
                          const key = col.key as ColumnKey;
                          let content: React.ReactNode = null;
                          if (i === 0) {
                            content = <Text type="secondary">{t("totalReturnsRowLabel")}</Text>;
                          } else if (key === "paid") {
                            content = (
                              <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                {formatCurrency(summaryQuery.data?.returned_amount ?? 0)}
                              </span>
                            );
                          }
                          return (
                            <Table.Summary.Cell
                              key={key}
                              index={i}
                              align={(col.align as "left" | "right" | "center") ?? "left"}
                            >
                              {content}
                            </Table.Summary.Cell>
                          );
                        })}
                      </Table.Summary.Row>

                      {/* Total cost (under the cost column) and net — paid minus returns — parallel to the paid column. */}
                      <Table.Summary.Row>
                        {displayedColumns.map((col, i) => {
                          const key = col.key as ColumnKey;
                          let content: React.ReactNode = null;
                          if (i === 0) {
                            content = <Text strong>{t("netRowLabel")}</Text>;
                          } else if (key === "cost") {
                            content = (
                              <Text type="secondary" strong>
                                {formatCurrency(summaryQuery.data?.total_cost ?? 0)}
                              </Text>
                            );
                          } else if (key === "paid") {
                            const net =
                              (summaryQuery.data?.paid_amount ?? 0) -
                              (summaryQuery.data?.returned_amount ?? 0);
                            content = (
                              <span style={{ color: "#2563eb", fontWeight: 700 }}>
                                {formatCurrency(net)}
                              </span>
                            );
                          }
                          return (
                            <Table.Summary.Cell
                              key={key}
                              index={i}
                              align={(col.align as "left" | "right" | "center") ?? "left"}
                            >
                              {content}
                            </Table.Summary.Cell>
                          );
                        })}
                      </Table.Summary.Row>
                    </Table.Summary>
                  )
                }
              />
            </Card>
          )}

          {/* Sales returns — a dedicated table for the same shift/date/cashier filters. */}
          {!salesQuery.isError && (
            <Card
              size="small"
              title={t("returnsListLabel")}
              styles={{ body: { padding: 0 } }}
            >
              <Table<SaleReturn>
                rowKey="id"
                size="small"
                columns={returnColumns}
                dataSource={saleReturns}
                loading={saleReturnsQuery.isLoading}
                scroll={{ x: 900 }}
                locale={{ emptyText: t("noReturnsMatchFilters") }}
                onRow={(r) => ({
                  onClick: () => r.sale_id && openSale(r.sale_id),
                  style: { cursor: r.sale_id ? "pointer" : "default" },
                })}
                pagination={{
                  current: saleReturnsMeta.current_page ?? returnsPage,
                  pageSize: RETURNS_PER_PAGE,
                  total: saleReturnsMeta.total ?? saleReturns.length,
                  showSizeChanger: false,
                  showTotal: (total) => t("returnsCountLabel") + `: ${total}`,
                }}
                onChange={(pagination) => setReturnsPage(pagination.current ?? 1)}
                summary={() =>
                  saleReturns.length === 0 ? null : (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={returnColumns.length - 1}>
                          <Text strong>{t("totalReturnsRowLabel")}</Text>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">
                          <span style={{ color: "#dc2626", fontWeight: 700 }}>
                            {formatCurrency(summaryQuery.data?.returned_amount ?? 0)}
                          </span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  )
                }
              />
            </Card>
          )}
        </div>

        <SaleDetailsDialog
          saleId={selectedSaleId}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onChanged={refetchAll}
        />
      </AntApp>
    </ConfigProvider>
  );
};

function FinanceExportButton({ sale }: { sale: Sale }) {
  const { t } = useTranslation("sales");
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const isExported = !!sale.finance_exported_at;

  const handleExportToFinance = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isExported) return;
    setIsExporting(true);
    try {
      await saleService.exportToFinance(sale.id);
      toast.success(t("journalEntrySent"));
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
    } catch (err) {
      toast.error(t("journalExportFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Tooltip title={isExported ? t("exportedTooltip") : t("exportFinance")}>
      <Button
        size="small"
        type={isExported ? "default" : "text"}
        disabled={isExporting || isExported}
        onClick={handleExportToFinance}
        icon={
          isExporting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : isExported ? (
            <CheckCircle2 size={15} style={{ color: "#059669" }} />
          ) : (
            <Landmark size={15} />
          )
        }
      />
    </Tooltip>
  );
}

export default SalesListPage;
