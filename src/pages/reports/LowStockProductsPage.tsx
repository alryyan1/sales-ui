// src/pages/reports/LowStockProductsPage.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  Flex,
  InputNumber,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getAntdThemeConfig } from "@/lib/antdTheme";
import {
  AlertCircle,
  AlertTriangle,
  Boxes,
  CalendarClock,
  CalendarDays,
  Download,
  Package,
  RefreshCw,
} from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { formatNumber } from "@/constants";
import reportService, { ExpiringProduct } from "@/services/reportService";

const { Title, Text } = Typography;

const CHART_LIMIT = 8;
const SOON_THRESHOLD_DAYS = 30;

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function severityColor(daysLeft: number): string {
  if (daysLeft < 0) return "#dc2626";
  if (daysLeft <= SOON_THRESHOLD_DAYS) return "#d97706";
  return "#2563eb";
}

const LowStockProductsPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [months, setMonths] = useState<number>(3);
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["expiring-low-stock-products", months, limit],
    queryFn: () => reportService.getExpiringProducts(months, limit),
  });

  const products = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => {
    let stockAtRisk = 0;
    let expired = 0;
    let expiringSoon = 0;
    products.forEach((p) => {
      stockAtRisk += Number(p.stock_quantity);
      const daysLeft = daysUntil(p.earliest_expiry_date);
      if (daysLeft < 0) expired += 1;
      else if (daysLeft <= SOON_THRESHOLD_DAYS) expiringSoon += 1;
    });
    return { stockAtRisk, expired, expiringSoon };
  }, [products]);

  const nearestExpiry = useMemo(
    () =>
      [...products].sort(
        (a, b) => new Date(a.earliest_expiry_date).getTime() - new Date(b.earliest_expiry_date).getTime()
      )[0],
    [products]
  );

  const chartData = useMemo(
    () =>
      [...products]
        .sort((a, b) => daysUntil(a.earliest_expiry_date) - daysUntil(b.earliest_expiry_date))
        .slice(0, CHART_LIMIT)
        .map((p) => ({
          name: p.name.length > 16 ? `${p.name.slice(0, 16)}…` : p.name,
          fullName: p.name,
          daysLeft: daysUntil(p.earliest_expiry_date),
        })),
    [products]
  );

  const handleExportCsv = () => {
    const header = [
      t("rowNumberColumn"),
      t("productLabel"),
      t("productCategoryColumn"),
      t("currentStockColumn"),
      t("nearestExpiryDateColumn"),
      t("daysToExpiry"),
    ];
    const rows = products.map((p, i) => [
      i + 1,
      p.name,
      p.category_name,
      p.stock_quantity,
      p.earliest_expiry_date,
      daysUntil(p.earliest_expiry_date),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expiring-products-${months}m.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("csvExported"));
  };

  const columns: TableProps<ExpiringProduct>["columns"] = [
    {
      title: t("rowNumberColumn"),
      key: "row",
      width: 48,
      align: "center",
      render: (_v, _r, index) => <Text type="secondary">{index + 1}</Text>,
    },
    {
      title: t("productLabel"),
      key: "product",
      render: (_v, product) => (
        <Flex align="center" gap={8}>
          <Flex
            align="center"
            justify="center"
            style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.04)", flexShrink: 0 }}
          >
            <Package size={14} color="rgba(0,0,0,0.4)" />
          </Flex>
          <div>
            <Text strong style={{ fontSize: 13 }}>
              {product.name}
            </Text>
            {product.sku && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {product.sku}
                </Text>
              </div>
            )}
          </div>
        </Flex>
      ),
    },
    {
      title: t("productCategoryColumn"),
      dataIndex: "category_name",
      key: "category",
      render: (name: string) => <Tag>{name}</Tag>,
    },
    {
      title: t("currentStockColumn"),
      dataIndex: "stock_quantity",
      key: "stock",
      align: "center",
      sorter: (a, b) => Number(a.stock_quantity) - Number(b.stock_quantity),
      render: (value: number) => (
        <Tag color={value > 10 ? "success" : value > 0 ? "default" : "error"}>{value}</Tag>
      ),
    },
    {
      title: t("nearestExpiryDateColumn"),
      key: "expiry",
      sorter: (a, b) => daysUntil(a.earliest_expiry_date) - daysUntil(b.earliest_expiry_date),
      defaultSortOrder: "ascend",
      render: (_v, product) => {
        const daysLeft = daysUntil(product.earliest_expiry_date);
        const isExpired = daysLeft < 0;
        const isSoon = !isExpired && daysLeft <= SOON_THRESHOLD_DAYS;
        return (
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 12 }}>
              {new Date(product.earliest_expiry_date).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}
            </Text>
            <Tag
              icon={isExpired ? <AlertCircle size={11} style={{ marginInlineEnd: 4 }} /> : undefined}
              color={isExpired ? "error" : isSoon ? "warning" : "default"}
              style={{ fontSize: 11 }}
            >
              {isExpired ? t("expiredBadge") : `${daysLeft} ${t("daysToExpiry")}`}
            </Tag>
          </Space>
        );
      },
    },
  ];

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={getAntdThemeConfig(resolvedTheme)}
    >
      <AntApp>
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Header */}
          <Flex align="center" justify="space-between" gap={8} wrap>
            <div>
              <Title level={5} style={{ margin: 0 }}>
                {t("lowStockExpiringProductsTitle")}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("lowStockExpiringProductsSubtitle")}
              </Text>
            </div>
            <Flex gap={8}>
              <Tooltip title={t("exportCsvButton")}>
                <Button size="small" icon={<Download size={14} />} disabled={!products.length} onClick={handleExportCsv} />
              </Tooltip>
              <Tooltip title={tCommon("refresh")}>
                <Button
                  size="small"
                  icon={<RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />}
                  onClick={() => refetch()}
                />
              </Tooltip>
            </Flex>
          </Flex>

          {/* KPI summary */}
          <Flex gap={10} wrap>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("totalStockAtRiskLabel")}</span>}
                value={formatNumber(totals.stockAtRisk)}
                prefix={<Boxes size={14} color="#d97706" />}
                valueStyle={{ fontSize: 18, color: "#d97706" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("alreadyExpiredLabel")}</span>}
                value={totals.expired}
                prefix={<AlertCircle size={14} color="#dc2626" />}
                valueStyle={{ fontSize: 18, color: "#dc2626" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("expiringSoonLabel")}</span>}
                value={totals.expiringSoon}
                prefix={<CalendarClock size={14} color="#d97706" />}
                valueStyle={{ fontSize: 18, color: "#d97706" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("nearestExpiryProductLabel")}</span>}
                value={nearestExpiry?.name ?? "—"}
                prefix={<AlertTriangle size={14} color="#dc2626" />}
                valueStyle={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              />
            </Card>
          </Flex>

          {/* Filters + chart */}
          <Flex gap={10} wrap align="stretch">
            <Card size="small" style={{ flex: "0 0 220px" }} title={<span style={{ fontSize: 13 }}>{t("reportFiltersTitle")}</span>}>
              <Flex vertical gap={10}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                    {t("periodInFutureMonthsLabel")}
                  </Text>
                  <InputNumber
                    size="small"
                    min={1}
                    max={60}
                    value={months}
                    onChange={(v) => setMonths(Number(v) || 1)}
                    style={{ width: "100%" }}
                  />
                </div>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                    {t("productsCountLabel")}
                  </Text>
                  <InputNumber
                    size="small"
                    min={1}
                    max={100}
                    value={limit}
                    onChange={(v) => setLimit(Number(v) || 1)}
                    style={{ width: "100%" }}
                  />
                </div>
              </Flex>
            </Card>

            <Card
              size="small"
              style={{ flex: "1 1 400px" }}
              title={
                <Flex align="center" gap={6}>
                  <CalendarDays size={14} />
                  <span style={{ fontSize: 13 }}>{t("expiryChartTitle")}</span>
                </Flex>
              }
            >
              <div style={{ height: 220 }}>
                {chartData.length === 0 ? (
                  <Flex align="center" justify="center" style={{ height: "100%" }}>
                    <Text type="secondary">{t("noExpiringProductsFound")}</Text>
                  </Flex>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" style={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => `${value} ${t("daysToExpiry")}`}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ""}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="daysLeft" radius={[0, 4, 4, 0]} barSize={16}>
                        {chartData.map((entry, index) => (
                          <Cell key={index} fill={severityColor(entry.daysLeft)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </Flex>

          {/* Results table */}
          <Card
            size="small"
            title={<span style={{ fontSize: 13 }}>{t("reportResultsTitle")}</span>}
            styles={{ body: { padding: 0 } }}
          >
            {isError ? (
              <Alert
                type="error"
                showIcon
                style={{ margin: 12 }}
                message={t("errorLoadingDataPrefix")}
                description={error instanceof Error ? error.message : t("unknownErrorText")}
              />
            ) : (
              <Table<ExpiringProduct>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={products}
                loading={isLoading}
                pagination={false}
                locale={{ emptyText: t("noExpiringProductsFound") }}
              />
            )}
          </Card>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

export default LowStockProductsPage;
