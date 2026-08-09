// src/pages/AnalyticsPage.tsx
import React, { useState, useEffect, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// MUI Components
import { Typography, CircularProgress } from "@mui/material";

// Icons
import {
  Ending,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
} from "lucide-react";

// Charts from recharts
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Services
import analyticsService, {
  AnalyticsData,
  DateRange,
} from "../services/analyticsService";
import { formatCurrency, formatNumber } from "@/constants";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// Color scheme for charts
const CHART_COLORS = {
  primary: "#3b82f6",
  secondary: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  indigo: "#6366f1",
  pink: "#ec4899",
  emerald: "#059669",
};

const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.purple,
  CHART_COLORS.indigo,
  CHART_COLORS.pink,
  CHART_COLORS.emerald,
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.dataKey}: ${
              entry.name === "amount" || entry.name === "value"
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)
            }`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// KPI Card Component
const KPICard: React.FC<{
  title: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, change, icon, color = "blue" }) => {
  const changeColor =
    change && change > 0
      ? "text-green-600"
      : change && change < 0
      ? "text-red-600"
      : "text-gray-600";
  const changeIcon =
    change && change > 0 ? (
      <TrendingUp className="h-3 w-3" />
    ) : change && change < 0 ? (
      <TrendingDown className="h-3 w-3" />
    ) : null;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </CardTitle>
          <div
            className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/20`}
          >
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          {change !== undefined && (
            <div className={`flex items-center text-xs ${changeColor}`}>
              {changeIcon}
              <span className="ml-1">
                {Math.abs(change).toFixed(1)}% from last period
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const AnalyticsPage: React.FC = () => {
  const { t } = useTranslation(["analytics", "common", "navigation"]);
  // State
  const [selectedRange, setSelectedRange] = useState<DateRange>("30days");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading,
    error,
    refetch,
  } = useQuery<AnalyticsData>({
    queryKey: ["analytics", selectedRange],
    queryFn: async () => {
      try {
        const data = await analyticsService.getAnalyticsData(selectedRange);
        setIsUsingMockData(false);
        return data;
      } catch (error) {
        console.warn("Using mock data due to API error:", error);
        setIsUsingMockData(true);
        throw error; // Re-throw to let useQuery handle the error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    onSuccess: () => {
      // Show success toast only when real data is loaded
      if (!isUsingMockData) {
        toast.success(t("analytics:dataRefreshed"));
      }
    },
    onError: () => {
      setIsUsingMockData(true);
      toast.warning(t("analytics:usingMockData"));
    },
  });

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!analyticsData) return null;

    return {
      totalSales: {
        value: formatCurrency(analyticsData.summary.total_sales_amount),
        change: analyticsData.summary.sales_growth_percentage,
      },
      totalPurchases: {
        value: formatCurrency(analyticsData.summary.total_purchases_amount),
        change: analyticsData.summary.purchases_growth_percentage,
      },
      totalOrders: {
        value: formatNumber(analyticsData.summary.total_orders),
        change: analyticsData.summary.orders_growth_percentage,
      },
    };
  }, [analyticsData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>{t("analytics:loadingAnalytics")}</Typography>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Typography color="error" className="mb-4">
            {t("analytics:errorLoadingData")}
          </Typography>
          <Button onClick={() => refetch()}>{t("common:retryAction")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {t("navigation:analytics")}
            </h1>
            <Badge
              variant={isUsingMockData ? "secondary" : "default"}
              className={`${
                isUsingMockData
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {isUsingMockData ? t("analytics:mockData") : t("analytics:realData")}
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {t("analytics:pageSubtitle")}
          </p>
          {isUsingMockData && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              {t("analytics:mockDataBanner")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedRange}
            onValueChange={(value: DateRange) => setSelectedRange(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">{t("analytics:last7Days")}</SelectItem>
              <SelectItem value="30days">{t("analytics:last30Days")}</SelectItem>
              <SelectItem value="90days">{t("analytics:last90Days")}</SelectItem>
              <SelectItem value="1year">{t("analytics:lastYear")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            {t("common:refresh")}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <KPICard
            title={t("analytics:totalSales")}
            value={kpis.totalSales.value}
            change={kpis.totalSales.change}
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            color="green"
          />
          <KPICard
            title={t("analytics:totalPurchases")}
            value={kpis.totalPurchases.value}
            change={kpis.totalPurchases.change}
            icon={<ShoppingCart className="h-4 w-4 text-blue-600" />}
            color="blue"
          />
          <KPICard
            title={t("analytics:totalOrders")}
            value={kpis.totalOrders.value}
            change={kpis.totalOrders.change}
            icon={<Package className="h-4 w-4 text-purple-600" />}
            color="purple"
          />
        </div>
      )}

      {/* Main Content */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t("analytics:overview")}</TabsTrigger>
          <TabsTrigger value="sales">{t("analytics:sales")}</TabsTrigger>
          <TabsTrigger value="purchases">{t("analytics:purchases")}</TabsTrigger>
          <TabsTrigger value="inventory">{t("analytics:inventory")}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t("analytics:salesTrend")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData.sales_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics:bestSellingProducts")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData.top_products?.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total_sold" fill={CHART_COLORS.secondary} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Sales */}
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics:dailySales")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={analyticsData.sales_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      name={t("analytics:salesValueSeries")}
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      name={t("analytics:ordersCountSeries")}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics:salesByCategory")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={analyticsData.sales_by_category}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {analyticsData.sales_by_category?.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Purchase Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics:purchaseTrend")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analyticsData.purchase_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke={CHART_COLORS.warning}
                      fill={CHART_COLORS.warning}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Suppliers */}
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics:topSuppliers")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.top_suppliers?.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="total_amount" fill={CHART_COLORS.indigo} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {/* Stock Levels */}
            <Card>
              <CardHeader>
                <CardTitle>{t("analytics:stockLevels")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analyticsData.stock_levels}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="current_stock" fill={CHART_COLORS.emerald} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
