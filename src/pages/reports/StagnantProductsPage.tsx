// src/pages/reports/StagnantProductsPage.tsx
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
  Progress,
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
import { AlertTriangle, Boxes, Download, History, Package, PackageX, RefreshCw } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { formatNumber } from "@/constants";
import reportService, { StagnantProduct } from "@/services/reportService";

const { Title, Text } = Typography;

const SEVERITY_COLORS = ["#dc2626", "#ea580c", "#d97706"]; // red, orange-red, amber
const CHART_LIMIT = 8;

const StagnantProductsPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const [months, setMonths] = useState<number>(3);
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["stagnant-products", months, limit],
    queryFn: () => reportService.getStagnantProducts(months, limit),
  });

  const products = useMemo(() => data ?? [], [data]);

  const totals = useMemo(
    () =>
      products.reduce(
        (acc, p) => ({
          stock: acc.stock + Number(p.stock_quantity),
          sales: acc.sales + Number(p.lifetime_sales),
        }),
        { stock: 0, sales: 0 }
      ),
    [products]
  );

  const maxStock = useMemo(
    () => products.reduce((max, p) => Math.max(max, Number(p.stock_quantity)), 0),
    [products]
  );

  const mostStagnant = useMemo(
    () => products.reduce((top, p) => (Number(p.stock_quantity) > Number(top?.stock_quantity ?? -1) ? p : top), products[0]),
    [products]
  );

  const chartData = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(b.stock_quantity) - Number(a.stock_quantity))
        .slice(0, CHART_LIMIT)
        .map((p) => ({
          name: p.name.length > 16 ? `${p.name.slice(0, 16)}…` : p.name,
          fullName: p.name,
          stock: Number(p.stock_quantity),
        })),
    [products]
  );

  const handleExportCsv = () => {
    const header = [
      t("rowNumberColumn"),
      t("productLabel"),
      t("productCategoryColumn"),
      t("stagnantStockColumn"),
      t("totalHistoricalSalesColumn"),
    ];
    const rows = products.map((p, i) => [i + 1, p.name, p.category_name, p.stock_quantity, p.lifetime_sales]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stagnant-products-${months}m.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("csvExported"));
  };

  const columns: TableProps<StagnantProduct>["columns"] = [
    {
      title: t("rowNumberColumn"),
      key: "row",
      width: 48,
      align: "center",
      render: (_v, _r, index) =>
        index < 3 ? (
          <Flex
            align="center"
            justify="center"
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: SEVERITY_COLORS[index],
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              margin: "0 auto",
            }}
          >
            {index + 1}
          </Flex>
        ) : (
          <Text type="secondary">{index + 1}</Text>
        ),
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
      title: t("stagnantStockColumn"),
      dataIndex: "stock_quantity",
      key: "stock",
      align: "center",
      sorter: (a, b) => Number(a.stock_quantity) - Number(b.stock_quantity),
      defaultSortOrder: "descend",
      render: (value: number) => (
        <Tag color="error" style={{ fontWeight: 600 }}>
          {formatNumber(value)}
        </Tag>
      ),
    },
    {
      title: t("shareOfStagnantStockColumn"),
      key: "share",
      width: 130,
      render: (_v, product) => {
        const pct = maxStock > 0 ? Math.round((Number(product.stock_quantity) / maxStock) * 100) : 0;
        return <Progress percent={pct} size="small" showInfo={false} strokeColor="#dc2626" />;
      },
    },
    {
      title: t("totalHistoricalSalesColumn"),
      dataIndex: "lifetime_sales",
      key: "sales",
      align: "center",
      sorter: (a, b) => Number(a.lifetime_sales) - Number(b.lifetime_sales),
      render: (value: number) => <Text type="secondary">{formatNumber(value)}</Text>,
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
                {t("stagnantProductsTitle")}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("stagnantProductsSubtitle")}
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
                title={<span style={{ fontSize: 12 }}>{t("reportResultsTitle")}</span>}
                value={products.length}
                prefix={<PackageX size={14} color="#dc2626" />}
                valueStyle={{ fontSize: 18, color: "#dc2626" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("totalStagnantStockLabel")}</span>}
                value={formatNumber(totals.stock)}
                prefix={<Boxes size={14} color="#ea580c" />}
                valueStyle={{ fontSize: 18, color: "#ea580c" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("totalHistoricalSalesColumn")}</span>}
                value={formatNumber(totals.sales)}
                prefix={<History size={14} />}
                valueStyle={{ fontSize: 18 }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("mostStagnantStockLabel")}</span>}
                value={mostStagnant?.name ?? "—"}
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
                    {t("periodInMonthsLabel")}
                  </Text>
                  <InputNumber
                    size="small"
                    min={1}
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
                  <PackageX size={14} />
                  <span style={{ fontSize: 13 }}>{t("stagnantChartTitle")}</span>
                </Flex>
              }
            >
              <div style={{ height: 220 }}>
                {chartData.length === 0 ? (
                  <Flex align="center" justify="center" style={{ height: "100%" }}>
                    <Text type="secondary">{t("noStagnantProductsFound")}</Text>
                  </Flex>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => formatNumber(v)} style={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => formatNumber(value)}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ""}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="stock" radius={[0, 4, 4, 0]} barSize={16}>
                        {chartData.map((_entry, index) => (
                          <Cell key={index} fill={SEVERITY_COLORS[index] ?? "#dc2626"} />
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
              <Table<StagnantProduct>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={products}
                loading={isLoading}
                pagination={false}
                locale={{ emptyText: t("noStagnantProductsFound") }}
              />
            )}
          </Card>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

export default StagnantProductsPage;
