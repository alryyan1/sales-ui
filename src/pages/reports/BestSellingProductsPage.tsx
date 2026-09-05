// src/pages/reports/BestSellingProductsPage.tsx
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
import { Award, DollarSign, Download, Layers, Package, RefreshCw, TrendingUp } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { formatNumber } from "@/constants";
import reportService, { BestSellingProduct } from "@/services/reportService";

const { Title, Text } = Typography;

const RANK_COLORS = ["#f59e0b", "#94a3b8", "#b45309"]; // gold, silver, bronze
const CHART_LIMIT = 8;

const BestSellingProductsPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const formatCurrency = useFormatCurrency();
  const [days, setDays] = useState<number>(30);
  const [limit, setLimit] = useState<number>(10);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ["best-selling-products", days, limit],
    queryFn: () => reportService.getBestSellingProducts(days, limit),
  });

  const products = useMemo(() => data ?? [], [data]);

  const totals = useMemo(
    () =>
      products.reduce(
        (acc, p) => ({
          revenue: acc.revenue + Number(p.total_revenue),
          quantity: acc.quantity + Number(p.total_quantity_sold),
        }),
        { revenue: 0, quantity: 0 }
      ),
    [products]
  );

  const maxRevenue = useMemo(
    () => products.reduce((max, p) => Math.max(max, Number(p.total_revenue)), 0),
    [products]
  );

  const chartData = useMemo(
    () =>
      products.slice(0, CHART_LIMIT).map((p) => ({
        name: p.name.length > 16 ? `${p.name.slice(0, 16)}…` : p.name,
        fullName: p.name,
        revenue: Number(p.total_revenue),
      })),
    [products]
  );

  const handleExportCsv = () => {
    const header = [
      t("rowNumberColumn"),
      t("productLabel"),
      t("productCategoryColumn"),
      t("quantitySoldColumn"),
      t("totalSales"),
      t("currentStockColumn"),
    ];
    const rows = products.map((p, i) => [
      i + 1,
      p.name,
      p.category_name,
      p.total_quantity_sold,
      p.total_revenue,
      p.current_stock,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([String.fromCharCode(0xFEFF) + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `best-selling-products-${days}d.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("csvExported"));
  };

  const columns: TableProps<BestSellingProduct>["columns"] = [
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
              backgroundColor: RANK_COLORS[index],
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
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              style={{ width: 28, height: 28, borderRadius: 4, objectFit: "cover", border: "1px solid rgba(0,0,0,0.08)" }}
            />
          ) : (
            <Flex
              align="center"
              justify="center"
              style={{ width: 28, height: 28, borderRadius: 4, backgroundColor: "rgba(0,0,0,0.04)", flexShrink: 0 }}
            >
              <Package size={14} color="rgba(0,0,0,0.4)" />
            </Flex>
          )}
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
      title: t("quantitySoldColumn"),
      dataIndex: "total_quantity_sold",
      key: "quantity",
      align: "center",
      sorter: (a, b) => Number(a.total_quantity_sold) - Number(b.total_quantity_sold),
      render: (value: number) => (
        <Text strong style={{ color: "#2563eb" }}>
          {formatNumber(value)}
        </Text>
      ),
    },
    {
      title: t("totalSales"),
      dataIndex: "total_revenue",
      key: "revenue",
      align: "center",
      sorter: (a, b) => Number(a.total_revenue) - Number(b.total_revenue),
      defaultSortOrder: "descend",
      render: (value: number) => (
        <Text strong style={{ color: "#16a34a" }}>
          {formatCurrency(value)}
        </Text>
      ),
    },
    {
      title: t("shareOfRevenueColumn"),
      key: "share",
      width: 130,
      render: (_v, product) => {
        const pct = maxRevenue > 0 ? Math.round((Number(product.total_revenue) / maxRevenue) * 100) : 0;
        return <Progress percent={pct} size="small" showInfo={false} strokeColor="#16a34a" />;
      },
    },
    {
      title: t("currentStockColumn"),
      dataIndex: "current_stock",
      key: "stock",
      align: "center",
      render: (value: number) => (
        <Tag color={value > 10 ? "success" : value > 0 ? "default" : "error"}>{value}</Tag>
      ),
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
                {t("bestSellingProductsTitle")}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("bestSellingProductsSubtitle")}
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
                title={<span style={{ fontSize: 12 }}>{t("totalRevenue")}</span>}
                value={formatCurrency(totals.revenue)}
                prefix={<DollarSign size={14} color="#16a34a" />}
                valueStyle={{ fontSize: 18, color: "#16a34a" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("quantitySoldColumn")}</span>}
                value={formatNumber(totals.quantity)}
                prefix={<Package size={14} color="#2563eb" />}
                valueStyle={{ fontSize: 18, color: "#2563eb" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("productsTrackedLabel")}</span>}
                value={products.length}
                prefix={<Layers size={14} />}
                valueStyle={{ fontSize: 18 }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("topProductLabel")}</span>}
                value={products[0]?.name ?? "—"}
                prefix={<Award size={14} color="#f59e0b" />}
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
                    {t("periodInDaysLabel")}
                  </Text>
                  <InputNumber
                    size="small"
                    min={1}
                    value={days}
                    onChange={(v) => setDays(Number(v) || 1)}
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
                  <TrendingUp size={14} />
                  <span style={{ fontSize: 13 }}>{t("topProductsChartTitle")}</span>
                </Flex>
              }
            >
              <div style={{ height: 220 }}>
                {chartData.length === 0 ? (
                  <Flex align="center" justify="center" style={{ height: "100%" }}>
                    <Text type="secondary">{t("noDataForThisPeriod")}</Text>
                  </Flex>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => formatNumber(v)} style={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ""}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                        {chartData.map((_entry, index) => (
                          <Cell key={index} fill={RANK_COLORS[index] ?? "#2563eb"} />
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
              <Table<BestSellingProduct>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={products}
                loading={isLoading}
                pagination={false}
                locale={{ emptyText: t("noDataForThisPeriod") }}
              />
            )}
          </Card>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

export default BestSellingProductsPage;
