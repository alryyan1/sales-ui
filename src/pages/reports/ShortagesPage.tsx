// src/pages/reports/ShortagesPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Alert,
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  Flex,
  Input,
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
import { AlertTriangle, Download, Layers, Package, PackageX, RefreshCw, Search } from "lucide-react";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/services/productService";

const { Title, Text } = Typography;

const CHART_LIMIT = 8;
const RANK_COLORS = ["#dc2626", "#ea580c", "#d97706"]; // red, orange-red, amber

const ShortagesPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const formatCurrency = useFormatCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [searchTerm]);

  const { data, isLoading, isFetching, isError, error, refetch } = useProducts({
    perPage: 100,
    search: debouncedSearchTerm,
    outOfStockOnly: true,
  });

  const products = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const totals = useMemo(() => {
    const restockCost = products.reduce((sum, p) => sum + Number(p.latest_purchase_cost || 0), 0);
    const categories = new Set(products.map((p) => p.category_name || t("uncategorizedLabel")));
    return { restockCost, categoriesCount: categories.size };
  }, [products, t]);

  const priorityProduct = useMemo(
    () => [...products].sort((a, b) => Number(b.sale_price || 0) - Number(a.sale_price || 0))[0],
    [products]
  );

  const maxSalePrice = useMemo(
    () => products.reduce((max, p) => Math.max(max, Number(p.sale_price || 0)), 0),
    [products]
  );

  const chartData = useMemo(
    () =>
      [...products]
        .sort((a, b) => Number(b.sale_price || 0) - Number(a.sale_price || 0))
        .slice(0, CHART_LIMIT)
        .map((p) => ({
          name: p.name.length > 16 ? `${p.name.slice(0, 16)}…` : p.name,
          fullName: p.name,
          value: Number(p.sale_price || 0),
        })),
    [products]
  );

  const handleExportCsv = () => {
    const header = [
      t("rowNumberColumn"),
      t("productLabel"),
      t("productCategoryColumn"),
      t("unitCostColumn"),
      t("lastSalePriceColumn"),
      t("stockColumn"),
    ];
    const rows = products.map((p, i) => [
      i + 1,
      p.name,
      p.category_name || t("uncategorizedLabel"),
      p.latest_purchase_cost ?? 0,
      p.sale_price ?? 0,
      p.stock_quantity,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([String.fromCharCode(0xfeff) + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "shortages-restock-list.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t("csvExported"));
  };

  const columns: TableProps<Product>["columns"] = [
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
      key: "category",
      render: (_v, product) => <Tag>{product.category_name || t("uncategorizedLabel")}</Tag>,
    },
    {
      title: t("unitCostColumn"),
      dataIndex: "latest_purchase_cost",
      key: "cost",
      align: "center",
      sorter: (a, b) => Number(a.latest_purchase_cost || 0) - Number(b.latest_purchase_cost || 0),
      render: (value: number | string | null) => <Text type="secondary">{formatCurrency(Number(value || 0))}</Text>,
    },
    {
      title: t("lastSalePriceColumn"),
      dataIndex: "sale_price",
      key: "price",
      align: "center",
      sorter: (a, b) => Number(a.sale_price || 0) - Number(b.sale_price || 0),
      defaultSortOrder: "descend",
      render: (value: number | null) => (
        <Text strong style={{ color: "#16a34a" }}>
          {formatCurrency(Number(value || 0))}
        </Text>
      ),
    },
    {
      title: t("restockPriorityColumn"),
      key: "priority",
      width: 130,
      render: (_v, product) => {
        const pct = maxSalePrice > 0 ? Math.round((Number(product.sale_price || 0) / maxSalePrice) * 100) : 0;
        return <Progress percent={pct} size="small" showInfo={false} strokeColor="#dc2626" />;
      },
    },
    {
      title: t("stockColumn"),
      dataIndex: "stock_quantity",
      key: "stock",
      align: "center",
      render: (value: number) => <Tag color="error">{value}</Tag>,
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
                {t("shortagesReportTitle")}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {t("shortagesReportSubtitle")}
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
                title={<span style={{ fontSize: 12 }}>{t("depletedProductsLabel")}</span>}
                value={products.length}
                prefix={<PackageX size={14} color="#dc2626" />}
                valueStyle={{ fontSize: 18, color: "#dc2626" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("totalRestockCostLabel")}</span>}
                value={formatCurrency(totals.restockCost)}
                prefix={<PackageX size={14} color="#d97706" />}
                valueStyle={{ fontSize: 18, color: "#d97706" }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("categoriesAffectedLabel")}</span>}
                value={totals.categoriesCount}
                prefix={<Layers size={14} />}
                valueStyle={{ fontSize: 18 }}
              />
            </Card>
            <Card size="small" style={{ flex: "1 1 200px" }}>
              <Statistic
                title={<span style={{ fontSize: 12 }}>{t("priorityRestockLabel")}</span>}
                value={priorityProduct?.name ?? "—"}
                prefix={<AlertTriangle size={14} color="#dc2626" />}
                valueStyle={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              />
            </Card>
          </Flex>

          {/* Search + chart */}
          <Flex gap={10} wrap align="stretch">
            <Card size="small" style={{ flex: "0 0 240px" }} title={<span style={{ fontSize: 13 }}>{t("reportFiltersTitle")}</span>}>
              <Input
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("searchForProductPlaceholder")}
                prefix={<Search size={14} style={{ opacity: 0.5 }} />}
              />
            </Card>

            <Card
              size="small"
              style={{ flex: "1 1 400px" }}
              title={
                <Flex align="center" gap={6}>
                  <PackageX size={14} />
                  <span style={{ fontSize: 13 }}>{t("shortagesChartTitle")}</span>
                </Flex>
              }
            >
              <div style={{ height: 220 }}>
                {chartData.length === 0 ? (
                  <Flex align="center" justify="center" style={{ height: "100%" }}>
                    <Text type="secondary">{t("noShortageProductsFound")}</Text>
                  </Flex>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} style={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} />
                      <RechartsTooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName ?? ""}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                        {chartData.map((_entry, index) => (
                          <Cell key={index} fill={RANK_COLORS[index] ?? "#dc2626"} />
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
            title={<span style={{ fontSize: 13 }}>{t("depletedProductsLabel")}</span>}
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
              <Table<Product>
                rowKey="id"
                size="small"
                columns={columns}
                dataSource={products}
                loading={isLoading}
                pagination={false}
                locale={{ emptyText: t("noShortageProductsFound") }}
              />
            )}
          </Card>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

export default ShortagesPage;
