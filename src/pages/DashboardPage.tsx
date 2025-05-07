// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link as RouterLink, useNavigate } from "react-router-dom"; // For linking cards
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For low stock notice
import {
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Package,
  Users,
  Building,
  ShoppingCart,
  CircleDollarSign,
  ArrowRight,
} from "lucide-react"; // Example icons

// API Client & Error Helpers
import apiClient, { getErrorMessage } from "@/lib/axios"; // Adjust path
import { Button } from "@/components/ui/button";
import {
  format,
  formatNumber,
  formatNu,
  formatNumbermberNumber,
} from "@/constants";

// Types (Define the expected structure of the summary data)
interface SalesSummary {
  today_amount: number;
  yesterday_amount: number;
  this_week_amount: number;
  this_month_amount: number;
  this_year_amount: number;
  total_amount: number;
  today_count: number;
  this_month_count: number;
}
interface PurchasesSummary {
  today_amount: number;
  this_month_amount: number;
  this_month_count: number;
}
interface InventorySummary {
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  low_stock_sample: Record<string, string>; // Assuming { quantity: name } -> needs adjustment if different
}
interface EntitiesSummary {
  total_clients: number;
  total_suppliers: number;
}
interface DashboardSummaryData {
  sales: SalesSummary;
  purchases: PurchasesSummary;
  inventory: InventorySummary;
  entities: EntitiesSummary;
  // recent_sales?: Sale[]; // Add types if using recent data
  // recent_purchases?: Purchase[];
}

// --- Component ---
const DashboardPage: React.FC = () => {
  const { t } = useTranslation(["dashboard", "common"]); // Load dashboard namespace
const navigate = useNavigate(); // For navigation
  // --- State ---
  const [summaryData, setSummaryData] = useState<DashboardSummaryData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: DashboardSummaryData }>(
        "/dashboard/summary"
      );
      setSummaryData(response.data.data);
      console.log("Dashboard data fetched:", response.data.data);
    } catch (err) {
      console.error("Failed to fetch dashboard summary:", err);
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      toast.error(t("common:error"), { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, [t]); // Dependency for translation in error

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]); // Fetch on component mount

  // --- Loading State UI ---
  const renderSkeletons = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map(
        (
          _,
          i // Render 4 skeleton cards
        ) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-2/5" /> {/* Skeleton for title */}
              <Skeleton className="h-6 w-6 rounded-full" />{" "}
              {/* Skeleton for icon */}
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-3/5 mb-2" />{" "}
              {/* Skeleton for main value */}
              <Skeleton className="h-3 w-4/5" />{" "}
              {/* Skeleton for description */}
            </CardContent>
          </Card>
        )
      )}
    </div>
  );

  // --- Error State UI ---
  if (!isLoading && error) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchSummary} variant="outline" className="mt-4">
          {t("common:retry")}
        </Button>
      </div>
    );
  }

  // --- Main Dashboard Content ---
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 dark:bg-gray-950">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
        {t("dashboard:title")} {/* Add key */}
      </h1>

      {isLoading ? (
        renderSkeletons()
      ) : !summaryData ? (
        <p className="text-muted-foreground">{t("common:noData")}</p> // Handle case where data is null after loading
      ) : (
        // Grid for Summary Cards
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Sales Today Card */}
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard:salesToday")}
              </CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summaryData.sales.today_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("dashboard:salesTodayCount", {
                  count: summaryData.sales.today_count,
                })}{" "}
                {/* Add key with count */}
              </p>
            </CardContent>
          </Card>

          {/* Sales This Month Card */}
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard:salesMonth")}
              </CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summaryData.sales.this_month_amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("dashboard:salesMonthCount", {
                  count: summaryData.sales.this_month_count,
                })}
              </p>
            </CardContent>
          </Card>

          {/* Low Stock Card */}
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard:lowStock")}
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  summaryData.inventory.low_stock_count > 0
                    ? "text-orange-600 dark:text-orange-400"
                    : ""
                }`}
              >
                {summaryData.inventory.low_stock_count}
              </div>
              {/* Link to products page, maybe pre-filtered? */}
              <RouterLink
                to="/products"
                className="text-xs text-muted-foreground hover:underline"
              >
                {t("dashboard:viewProducts")} {/* Add key */}
                {summaryData.inventory.out_of_stock_count > 0 && (
                  <span className="ms-1 text-red-600 dark:text-red-400">
                    (
                    {t("dashboard:outOfStockCount", {
                      count: summaryData.inventory.out_of_stock_count,
                    })}
                    )
                  </span>
                )}
              </RouterLink>
            </CardContent>
          </Card>

          {/* Total Clients Card */}
          <Card className="dark:bg-gray-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard:totalClients")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryData.entities.total_clients}
              </div>
              <RouterLink
                to="/clients"
                className="text-xs text-muted-foreground hover:underline"
              >
                {t("dashboard:manageClients")} {/* Add key */}
              </RouterLink>
            </CardContent>
          </Card>


          {/* Total Suppliers Card */}
          <Card
            className="dark:bg-gray-900 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate("/suppliers")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("dashboard:totalSuppliers")}
              </CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(summaryData.entities.total_suppliers)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {t("dashboard:manageSuppliers")}
                <ArrowRight className="inline h-3 w-3 ms-1" />
              </p>
            </CardContent>
          </Card>
               {/* --- Low Stock Sample Display --- */}
               {summaryData.inventory.low_stock_count > 0 && (
                        <Card className="dark:bg-gray-900">
                            <CardHeader>
                                <CardTitle className="text-md font-semibold flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-orange-500"/>
                                    {t('dashboard:lowStockItemsTitle')} {/* Add key */}
                                </CardTitle>
                                <CardDescription>
                                    {t('dashboard:lowStockItemsDesc')} {/* Add key */}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ul className="list-disc ps-5 text-sm text-muted-foreground space-y-1">
                                     {/* Adapt based on how low_stock_sample is structured */}
                                     {Array.isArray(summaryData.inventory.low_stock_sample) ? (
                                         summaryData.inventory.low_stock_sample.map((item, index) => (
                                             <li key={index}>
                                                 {item.name} ({t('dashboard:remainingStock', { count: item.stock_quantity })}) {/* Add key */}
                                             </li>
                                         ))
                                     ) : ( // Handle if it's an object like { quantity: name }
                                         Object.entries(summaryData.inventory.low_stock_sample).map(([quantity, name]) => (
                                              <li key={name}>
                                                  {name} ({t('dashboard:remainingStock', { count: quantity })})
                                              </li>
                                         ))
                                     )}

                                </ul>
                                {summaryData.inventory.low_stock_count > 5 && ( // Show link if sample is limited
                                    <Button variant="link" asChild className="ps-0 h-auto pt-3 text-xs">
                                        <RouterLink to="/products">{t('dashboard:viewAllLowStock')}</RouterLink> {/* Add key */}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}
          {/* Add Total Products Card */}
                         {/* <Card className="dark:bg-gray-900 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/products')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('dashboard:totalProducts')}</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatNumber(summaryData.inventory.total_products)}</div>
                                <p className="text-xs text-muted-foreground flex items-center">
                                    {t('dashboard:viewProducts')}
                                     <ArrowRight className="inline h-3 w-3 ms-1"/>
                                 </p>
                            </CardContent>
                        </Card> */}

</div>



        
      )}

      {/* TODO: Add sections for Recent Activity or Charts */}
      {/* <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                 <Card className="col-span-4"> ... Recent Sales Table ... </Card>
                 <Card className="col-span-3"> ... Sales Chart ... </Card>
             </div> */}
    </div>
  );
};

export default DashboardPage;
