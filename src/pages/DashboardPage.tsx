import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { DateRange } from "react-day-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertCircle,
  FileText,
  LucideIcon,
  PackageMinus,
  PackageX,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import apiClient, { getErrorMessage } from "@/lib/axios";
import { toLocalYMD } from "@/constants";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { cn } from "@/lib/utils";
import productService, { type Product } from "@/services/productService";

interface ProfitSummaryData {
  start_date: string;
  end_date: string;
  total_sales_amount: number;
  paid_sales_amount: number;
  expenses_amount: number;
  cost_of_sales_amount: number;
  profit: number;
}

const StatCard: React.FC<{
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
  loading?: boolean;
  emphasize?: boolean;
}> = ({ title, value, description, icon: Icon, loading, emphasize }) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-3">
      {loading ? (
        <Skeleton className="h-9 w-32" />
      ) : (
        <div className={cn("text-3xl font-semibold tabular-nums text-foreground", emphasize && "text-primary")}>
          {value}
        </div>
      )}
    </CardContent>
  </Card>
);

const StockProductsCard: React.FC<{
  title: string;
  description: string;
  emptyLabel: string;
  products: Product[];
  loading: boolean;
  onViewAll: () => void;
}> = ({ title, description, emptyLabel, products, loading, onViewAll }) => {
  const { t } = useTranslation("dashboard");
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="flex-shrink-0" onClick={onViewAll}>
            {t("viewAll")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-muted-foreground">
            <PackageX className="mb-2 h-8 w-8 text-muted-foreground/50" />
            {emptyLabel}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-center">{t("productColumn")}</TableHead>
                <TableHead className="text-center">{t("currentStockColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <div>{product.name}</div>
                    {product.sku && <div className="text-xs text-muted-foreground">{product.sku}</div>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.stock_quantity <= 0 ? "destructive" : "secondary"} className="tabular-nums">
                      {product.stock_quantity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const formatCurrency = useFormatCurrency();
  const { t } = useTranslation("dashboard");
  const { t: tCommon } = useTranslation("common");

  const today = useMemo(() => new Date(), []);
  const firstOfMonth = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today]);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: firstOfMonth, to: today });
  const startDate = dateRange?.from ? toLocalYMD(dateRange.from) : toLocalYMD(firstOfMonth);
  const endDate = dateRange?.to ? toLocalYMD(dateRange.to) : toLocalYMD(today);

  const [data, setData] = useState<ProfitSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await apiClient.get<{ data: ProfitSummaryData }>(`/dashboard/profit-summary?${q}`);
      setData(r.data.data);
    } catch (e) {
      const m = getErrorMessage(e);
      setError(m);
      toast.error(tCommon("error"), { description: m });
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, tCommon]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loadingLowStock, setLoadingLowStock] = useState(true);

  const fetchLowStock = useCallback(async () => {
    setLoadingLowStock(true);
    try {
      const r = await productService.getProducts(1, "", "stock_quantity", "asc", 6, null, false, true, false);
      setLowStockProducts(r.data);
    } catch {
      setLowStockProducts([]);
    } finally {
      setLoadingLowStock(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStock();
  }, [fetchLowStock]);

  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [loadingOutOfStock, setLoadingOutOfStock] = useState(true);

  const fetchOutOfStock = useCallback(async () => {
    setLoadingOutOfStock(true);
    try {
      const r = await productService.getProducts(1, "", "stock_quantity", "asc", 6, null, false, false, true);
      setOutOfStockProducts(r.data);
    } catch {
      setOutOfStockProducts([]);
    } finally {
      setLoadingOutOfStock(false);
    }
  }, []);

  useEffect(() => {
    fetchOutOfStock();
  }, [fetchOutOfStock]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              fetchData();
              fetchLowStock();
              fetchOutOfStock();
            }}
            title={t("refresh")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title={t("totalRevenue")}
          value={formatCurrency(data?.total_sales_amount ?? 0)}
          description={t("totalRevenueDesc")}
          icon={FileText}
          loading={loading}
        />
        <StatCard
          title={t("totalPayments")}
          value={formatCurrency(data?.paid_sales_amount ?? 0)}
          description={t("totalPaymentsDesc")}
          icon={Wallet}
          loading={loading}
        />
        <StatCard
          title={t("totalCostOfSales")}
          value={formatCurrency(data?.cost_of_sales_amount ?? 0)}
          description={t("totalCostOfSalesDesc")}
          icon={PackageMinus}
          loading={loading}
        />
        <StatCard
          title={t("totalExpenses")}
          value={formatCurrency(data?.expenses_amount ?? 0)}
          description={t("totalExpensesDesc")}
          icon={Receipt}
          loading={loading}
        />
        <StatCard
          title={t("profit")}
          value={formatCurrency(data?.profit ?? 0)}
          description={t("profitDesc")}
          icon={TrendingUp}
          loading={loading}
          emphasize
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StockProductsCard
          title={t("lowStockTitle")}
          description={t("lowStockDesc")}
          emptyLabel={t("lowStockEmpty")}
          products={lowStockProducts}
          loading={loadingLowStock}
          onViewAll={() => navigate("/products")}
        />
        <StockProductsCard
          title={t("outOfStockTitle")}
          description={t("outOfStockDesc")}
          emptyLabel={t("outOfStockEmpty")}
          products={outOfStockProducts}
          loading={loadingOutOfStock}
          onViewAll={() => navigate("/products")}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
