// src/pages/reports/InventoryLogPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link as RouterLink } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import dayjs, { Dayjs } from "dayjs";
import { useTranslation } from "react-i18next";
import {
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  DatePicker,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { getAntdThemeConfig } from "@/lib/antdTheme";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { formatNumber } from "@/constants";

// Services and Types
import inventoryLogService, { InventoryLogEntry } from "@/services/inventoryLogService";
import { warehouseService } from "@/services/warehouseService";
import productService from "@/services/productService";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PER_PAGE = 25;

const MOVEMENT_TAG_COLOR: Record<string, string> = {
  purchase: "green",
  sale: "red",
  adjustment: "gold",
  requisition_issue: "blue",
};

const InventoryLogPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const movementTypes = useMemo(
    () => [
      { value: "purchase", label: t("movementTypePurchase") },
      { value: "sale", label: t("movementTypeSale") },
      { value: "adjustment", label: t("movementTypeAdjustment") },
      { value: "requisition_issue", label: t("movementTypeRequisitionIssue") },
    ],
    [t]
  );
  const getMovementLabel = (type: string) => movementTypes.find((m) => m.value === type)?.label ?? type;

  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const productId = searchParams.get("productId") || "";
  const productName = searchParams.get("productName") || "";
  const warehouseId = searchParams.get("warehouseId") || "";
  const type = searchParams.get("type") || "";
  const search = searchParams.get("search") || "";
  const page = Number(searchParams.get("page") || "1");

  const [searchInput, setSearchInput] = useState(search);
  const [productSearch, setProductSearch] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => setSearchInput(search), [search]);

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) patchParams({ search: searchInput || null, page: "1" });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const warehousesQuery = useQuery({
    queryKey: ["inventory-log-warehouses"],
    queryFn: () => warehouseService.getAll(),
    staleTime: 5 * 60 * 1000,
  });

  const productOptionsQuery = useQuery({
    queryKey: ["inventory-log-products", productSearch],
    queryFn: () => productService.getProductsForAutocomplete(productSearch, 20),
    placeholderData: keepPreviousData,
  });

  const productOptions = useMemo(() => {
    const opts = (productOptionsQuery.data ?? []).map((p) => ({
      value: String(p.id),
      label: p.sku ? `${p.name} (${p.sku})` : p.name,
    }));
    if (productId && !opts.some((o) => o.value === productId)) {
      opts.unshift({ value: productId, label: productName || `#${productId}` });
    }
    return opts;
  }, [productOptionsQuery.data, productId, productName]);

  const filters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    productId: productId ? Number(productId) : undefined,
    warehouseId: warehouseId ? Number(warehouseId) : undefined,
    type: type || undefined,
    search: search || undefined,
  };

  const logQuery = useQuery({
    queryKey: ["inventory-log", page, filters.startDate, filters.endDate, filters.productId, filters.warehouseId, filters.type, filters.search],
    queryFn: () => inventoryLogService.getInventoryLog(page, PER_PAGE, filters),
    placeholderData: keepPreviousData,
  });

  const logData = logQuery.data;
  const entries = logData?.data ?? [];

  const hasActiveFilters = !!(startDate || endDate || productId || warehouseId || type || search);

  const clearFilters = () => {
    setSearchInput("");
    setProductSearch("");
    setSearchParams(new URLSearchParams());
  };

  const handleRangeChange = (values: null | (Dayjs | null)[]) => {
    patchParams({
      startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : null,
      endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : null,
      page: "1",
    });
  };

  const generatePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const blob = await inventoryLogService.generatePdf(filters);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory-log-${dayjs().format("YYYY-MM-DD")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(t("pdfGenerated"));
    } catch {
      toast.error(t("pdfGenerationFailed"));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const columns: TableProps<InventoryLogEntry>["columns"] = [
    {
      title: t("dateColumn"),
      dataIndex: "transaction_date",
      key: "date",
      width: 110,
      render: (value: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{dayjs(value).format("YYYY-MM-DD")}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(value).format("HH:mm")}
          </Text>
        </Space>
      ),
    },
    {
      title: t("operationColumn"),
      dataIndex: "type",
      key: "type",
      align: "center",
      width: 130,
      render: (movementType: string) => (
        <Tag color={MOVEMENT_TAG_COLOR[movementType] ?? "default"}>{getMovementLabel(movementType)}</Tag>
      ),
    },
    {
      title: t("productLabel"),
      key: "product",
      render: (_v, row) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{row.product_name}</Text>
          {row.product_sku && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.product_sku}
            </Text>
          )}
          {row.batch_number && (
            <Text style={{ fontSize: 12, color: "#0284c7" }}>
              {t("batchColonPrefix")} {row.batch_number}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t("warehouseLabel"),
      dataIndex: "warehouse_name",
      key: "warehouse",
      align: "center",
      width: 140,
      render: (name: string) => <Text type="secondary">{name || "—"}</Text>,
    },
    {
      title: t("quantityColumn"),
      dataIndex: "quantity_change",
      key: "quantity",
      align: "center",
      width: 100,
      render: (value: number) => (
        <Text strong style={{ color: value > 0 ? "#16a34a" : "#dc2626" }}>
          <span dir="ltr">
            {value > 0 ? "+" : ""}
            {formatNumber(value)}
          </span>
        </Text>
      ),
    },
    {
      title: t("documentColumn"),
      key: "document",
      align: "center",
      width: 150,
      render: (_v, row) => (
        <Space direction="vertical" size={0} align="center">
          <RouterLink
            to={
              row.type === "purchase"
                ? `/purchases/${row.document_id}`
                : row.type === "sale"
                  ? `/sales/${row.document_id}`
                  : "#"
            }
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            {row.document_reference || `#${row.document_id}`}
          </RouterLink>
          {row.reason_notes && (
            <Tooltip title={row.reason_notes}>
              <Text type="secondary" style={{ fontSize: 11, maxWidth: 140 }} ellipsis>
                {row.reason_notes}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: t("byUserColumn"),
      dataIndex: "user_name",
      key: "user",
      align: "center",
      width: 110,
      render: (name: string | null) => <Tag>{name || "System"}</Tag>,
    },
  ];

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={getAntdThemeConfig(resolvedTheme)}
    >
      <AntApp>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <Flex align="center" justify="space-between" gap={12} wrap>
            <Flex align="center" gap={12}>
              <Button
                type="text"
                icon={direction === "rtl" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                onClick={() => navigate("/reports")}
              />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {t("inventoryLogPageTitle")}
                </Title>
                <Text type="secondary">{t("inventoryLogPageSubtitle")}</Text>
              </div>
            </Flex>
            <Button
              type="primary"
              icon={isGeneratingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              disabled={isGeneratingPdf}
              onClick={generatePdf}
            >
              {isGeneratingPdf ? t("exportingEllipsis") : t("exportPdf")}
            </Button>
          </Flex>

          {/* Filters */}
          <Card size="small" title={t("filterOptionsLabel")}>
            <Flex gap={12} wrap align="center">
              <Select
                showSearch
                allowClear
                placeholder={t("searchForProductPlaceholder")}
                style={{ width: 240 }}
                value={productId || undefined}
                filterOption={false}
                loading={productOptionsQuery.isFetching}
                notFoundContent={
                  productOptionsQuery.isFetching ? tCommon("loading") : t("noMatchingProducts")
                }
                onSearch={setProductSearch}
                onChange={(value, option) =>
                  patchParams({
                    productId: value ?? null,
                    productName: value ? (option as { label: string })?.label ?? "" : null,
                    page: "1",
                  })
                }
                options={productOptions}
              />

              <Input
                allowClear
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t("batchOrDocumentNumberPlaceholder")}
                prefix={<Search size={14} style={{ opacity: 0.5 }} />}
                style={{ width: 220 }}
              />

              <Select
                allowClear
                placeholder={t("warehouseLabel")}
                style={{ width: 170 }}
                loading={warehousesQuery.isLoading}
                value={warehouseId || undefined}
                onChange={(value) => patchParams({ warehouseId: value ?? null, page: "1" })}
                options={(warehousesQuery.data ?? []).map((w) => ({ value: String(w.id), label: w.name }))}
              />

              <Select
                allowClear
                placeholder={t("movementTypeLabel")}
                style={{ width: 170 }}
                value={type || undefined}
                onChange={(value) => patchParams({ type: value ?? null, page: "1" })}
                options={movementTypes}
              />

              <RangePicker
                value={startDate || endDate ? [startDate ? dayjs(startDate) : null, endDate ? dayjs(endDate) : null] : null}
                onChange={handleRangeChange}
              />

              {hasActiveFilters && (
                <Button type="link" onClick={clearFilters}>
                  {tCommon("clear")}
                </Button>
              )}

              <div style={{ flex: 1 }} />

              <Tooltip title={tCommon("refresh")}>
                <Button
                  icon={<RefreshCw size={16} className={logQuery.isFetching ? "animate-spin" : ""} />}
                  onClick={() => logQuery.refetch()}
                />
              </Tooltip>
            </Flex>
          </Card>

          {/* Results */}
          <Card size="small" styles={{ body: { padding: 0 } }}>
            <Table<InventoryLogEntry>
              rowKey={(row, index) => `${row.document_id}-${row.type}-${row.product_id}-${index}`}
              size="small"
              columns={columns}
              dataSource={entries}
              loading={logQuery.isLoading}
              scroll={{ x: 1000 }}
              locale={{ emptyText: t("noMatchingLogEntries") }}
              pagination={{
                current: logData?.current_page ?? page,
                pageSize: PER_PAGE,
                total: logData?.total ?? entries.length,
                showSizeChanger: false,
                showTotal: (total) => `${t("totalResultsColonLabel")} ${total}`,
              }}
              onChange={(pagination) => patchParams({ page: String(pagination.current ?? 1) })}
            />
          </Card>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

export default InventoryLogPage;
