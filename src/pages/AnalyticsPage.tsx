// src/pages/AnalyticsPage.tsx
import React, { useState, useEffect, useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";

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
  AlertTriangle,
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

// Expiry Alert Component
const ExpiryAlert: React.FC<{ item: any }> = ({ item }) => {
  const daysUntilExpiry = dayjs(item.expiry_date).diff(dayjs(), "day");
  const urgency =
    daysUntilExpiry <= 7 ? "high" : daysUntilExpiry <= 30 ? "medium" : "low";

  const urgencyColors = {
    high: "destructive",
    medium: "secondary",
    low: "outline",
  } as const;

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="font-medium">{item.product_name}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Batch: {item.batch_number || "N/A"} • Qty:{" "}
          {formatNumber(item.remaining_quantity)}
        </div>
        <div className="text-xs text-gray-500">
          Expires: {dayjs(item.expiry_date).format("MMM DD, YYYY")}
        </div>
      </div>
      <Badge variant={urgencyColors[urgency]}>
        {daysUntilExpiry <= 0 ? "Expired" : `${daysUntilExpiry} days`}
      </Badge>
    </div>
  );
};

const AnalyticsPage: React.FC = () => {
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
        toast.success("تم تحديث البيانات");
      }
    },
    onError: () => {
      setIsUsingMockData(true);
      toast.warning("يتم استخدام بيانات تجريبية");
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
      expiringItems: {
        value: formatNumber(analyticsData.expiring_items?.length || 0),
        change: undefined,
      },
    };
  }, [analyticsData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>جاري التحميل...</Typography>
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Typography color="error" className="mb-4">
            حدث خطأ أثناء تحميل البيانات
          </Typography>
          <Button onClick={() => refetch()}>إعادة المحاولة</Button>
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
              التحليلات
            </h1>
            <Badge
              variant={isUsingMockData ? "secondary" : "default"}
              className={`${
                isUsingMockData
                  ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              }`}
            >
              {isUsingMockData ? "بيانات تجريبية" : "بيانات حقيقية"}
            </Badge>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            نظرة عامة على أداء المتجر والمبيعات
          </p>
          {isUsingMockData && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              تنبيه: يتم عرض بيانات تجريبية لعدم توفر اتصال بالخادم
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
              <SelectItem value="7days">آخر 7 أيام</SelectItem>
              <SelectItem value="30days">آخر 30 يوم</SelectItem>
              <SelectItem value="90days">آخر 90 يوم</SelectItem>
              <SelectItem value="1year">السنة الماضية</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            تحديث
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KPICard
            title="إجمالي المبيعات"
            value={kpis.totalSales.value}
            change={kpis.totalSales.change}
            icon={<DollarSign className="h-4 w-4 text-green-600" />}
            color="green"
          />
          <KPICard
            title="إجمالي المشتريات"
            value={kpis.totalPurchases.value}
            change={kpis.totalPurchases.change}
            icon={<ShoppingCart className="h-4 w-4 text-blue-600" />}
            color="blue"
          />
          <KPICard
            title="إجمالي الطلبات"
            value={kpis.totalOrders.value}
            change={kpis.totalOrders.change}
            icon={<Package className="h-4 w-4 text-purple-600" />}
            color="purple"
          />
          <KPICard
            title="منتجات قاربت على الانتهاء"
            value={kpis.expiringItems.value}
            change={kpis.expiringItems.change}
            icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
            color="orange"
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
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="sales">المبيعات</TabsTrigger>
          <TabsTrigger value="purchases">المشتريات</TabsTrigger>
          <TabsTrigger value="inventory">المخزون</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  اتجاه المبيعات
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
                <CardTitle>أكثر المنتجات مبيعاً</CardTitle>
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
                <CardTitle>المبيعات اليومية</CardTitle>
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
                      name="قيمة المبيعات"
                    />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke={CHART_COLORS.secondary}
                      strokeWidth={2}
                      name="عدد الطلبات"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>المبيعات حسب الفئة</CardTitle>
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
                <CardTitle>اتجاه المشتريات</CardTitle>
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
                <CardTitle>أفضل الموردين</CardTitle>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock Levels */}
            <Card>
              <CardHeader>
                <CardTitle>مستويات المخزون</CardTitle>
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

            {/* Expiring Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  المنتجات قريبة الانتهاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {analyticsData.expiring_items?.length > 0 ? (
                    analyticsData.expiring_items.map((item, index) => (
                      <ExpiryAlert key={index} item={item} />
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      لا توجد منتجات قريبة الانتهاء حالياً
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsPage;
