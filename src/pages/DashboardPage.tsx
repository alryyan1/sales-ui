// src/pages/DashboardPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";
import { Link as RouterLink, useNavigate } from "react-router-dom"; // For linking cards

// shadcn/ui & Lucide Icons
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    AlertCircle,
    Package,
    Users,
    Building,
    ShoppingCart,
    CircleDollarSign,
    ListChecks, // Example for a list
    TrendingUp, // Example for a chart section
} from 'lucide-react';

// API Client & Error Helpers
import apiClient, { getErrorMessage } from '@/lib/axios'; // Adjust path as needed
import { formatCurrency, formatNumber } from '@/constants';



// --- Types (Ensure these match your backend response) ---
interface SalesSummary {
    today_amount: number;
    yesterday_amount?: number; // Optional
    this_week_amount?: number; // Optional
    this_month_amount: number;
    this_year_amount?: number; // Optional
    total_amount?: number;    // Optional
    today_count: number;
    this_month_count: number;
}
interface PurchasesSummary {
    today_amount?: number; // Optional
    this_month_amount: number;
    this_month_count: number;
}
interface InventorySummary {
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
    // Structure for low_stock_sample: array of objects
    low_stock_sample: Array<{ name: string; stock_quantity: number; id: number }>;
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
    // Optional: Add recent activities here if backend provides them
    // recent_sales?: Sale[];
    // recent_purchases?: Purchase[];
}

// --- Component ---
const DashboardPage: React.FC = () => {
    const { t } = useTranslation(['dashboard', 'common', 'products']); // Load necessary namespaces
    const navigate = useNavigate(); // Hook for programmatic navigation

    // --- State ---
    const [summaryData, setSummaryData] = useState<DashboardSummaryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchSummary = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiClient.get<{ data: DashboardSummaryData }>('/dashboard/summary');
            setSummaryData(response.data.data);
            console.log("Dashboard data fetched:", response.data.data);
        } catch (err) {
            console.error("Failed to fetch dashboard summary:", err);
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            toast.error(t('common:error'), { description: errorMsg });
        } finally {
            setIsLoading(false);
        }
    }, [t]); // Dependency for translation in error message

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]); // Fetch on component mount

    // --- Loading State UI ---
    const renderSkeletons = (count = 6) => ( // Default to 6 skeletons for a 2x3 or similar layout
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"> {/* Adjust grid based on card count */}
            {[...Array(count)].map((_, i) => (
                 <Card key={i} className="dark:bg-gray-900">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                         <Skeleton className="h-5 w-2/5 dark:bg-gray-700" />
                         <Skeleton className="h-6 w-6 rounded-full dark:bg-gray-700" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-3/5 mb-2 dark:bg-gray-700" />
                        <Skeleton className="h-4 w-4/5 dark:bg-gray-700" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    // --- Error State UI ---
    if (!isLoading && error) {
        return (
            <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-[calc(100vh-100px)] flex flex-col items-center justify-center">
                <Alert variant="destructive" className="max-w-lg w-full">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('common:errorFetchingData') || "Error Fetching Data"}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                 <Button onClick={fetchSummary} variant="outline" className="mt-6">
                     {t('common:retry')}
                 </Button>
            </div>
        );
    }

    // --- Main Dashboard Content ---
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 dark:bg-gray-950">
             <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                {t('dashboard:title')}
            </h1>

            {isLoading ? renderSkeletons() : !summaryData ? (
                <p className="text-muted-foreground dark:text-gray-400">{t('common:noData')}</p>
            ) : (
                <> {/* Fragment to hold multiple sections */}
                    {/* Summary Cards Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3"> {/* 3 cards per row on larger screens */}

                        {/* Sales This Month Card */}
                        <Card className="dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700" onClick={() => navigate('/sales')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard:salesMonth')}</CardTitle>
                                <CircleDollarSign className="h-5 w-5 text-muted-foreground dark:text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(summaryData.sales.this_month_amount)}</div>
                                <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    {t('dashboard:salesMonthCount', { count: formatNumber(summaryData.sales.this_month_count) })}
                                     <ArrowRight className="inline h-3 w-3 ms-1 opacity-70"/>
                                </p>
                            </CardContent>
                        </Card>

                        {/* Purchases This Month Card */}
                        <Card className="dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700" onClick={() => navigate('/purchases')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard:purchasesMonth')}</CardTitle>
                                <ShoppingCart className="h-5 w-5 text-muted-foreground dark:text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(summaryData.purchases.this_month_amount)}</div>
                                <p className="text-xs text-muted-foreground dark:text-gray-400">
                                    {t('dashboard:purchasesMonthCount', { count: formatNumber(summaryData.purchases.this_month_count) })}
                                     <ArrowRight className="inline h-3 w-3 ms-1 opacity-70"/>
                                </p>
                            </CardContent>
                        </Card>

                        {/* Low Stock Products Card */}
                         <Card className="dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700" onClick={() => navigate('/products')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard:lowStock')}</CardTitle>
                                <AlertCircle className="h-5 w-5 text-orange-500 dark:text-orange-400" /> {/* Highlight icon color */}
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${summaryData.inventory.low_stock_count > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                    {formatNumber(summaryData.inventory.low_stock_count)}
                                </div>
                                <div className="text-xs text-muted-foreground dark:text-gray-400">
                                    {t('dashboard:viewProducts')}
                                    {summaryData.inventory.out_of_stock_count > 0 && (
                                        <span className="ms-1 text-red-600 dark:text-red-400">({t('dashboard:outOfStockCount', { count: formatNumber(summaryData.inventory.out_of_stock_count) })})</span>
                                     )}
                                     <ArrowRight className="inline h-3 w-3 ms-1 opacity-70"/>
                                 </div>
                             </CardContent>
                         </Card>

                        {/* Total Clients Card */}
                        <Card className="dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700" onClick={() => navigate('/clients')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard:totalClients')}</CardTitle>
                                <Users className="h-5 w-5 text-muted-foreground dark:text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(summaryData.entities.total_clients)}</div>
                                <p className="text-xs text-muted-foreground dark:text-gray-400 flex items-center">
                                     {t('dashboard:manageClients')}
                                     <ArrowRight className="inline h-3 w-3 ms-1 opacity-70"/>
                                </p>
                            </CardContent>
                        </Card>

                        {/* Total Suppliers Card */}
                        <Card className="dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700" onClick={() => navigate('/suppliers')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard:totalSuppliers')}</CardTitle>
                                <Building className="h-5 w-5 text-muted-foreground dark:text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(summaryData.entities.total_suppliers)}</div>
                                <p className="text-xs text-muted-foreground dark:text-gray-400 flex items-center">
                                     {t('dashboard:manageSuppliers')}
                                     <ArrowRight className="inline h-3 w-3 ms-1 opacity-70"/>
                                </p>
                            </CardContent>
                        </Card>

                         {/* Total Products Card */}
                         <Card className="dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer dark:border-gray-700" onClick={() => navigate('/products')}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('dashboard:totalProducts')}</CardTitle>
                                <Package className="h-5 w-5 text-muted-foreground dark:text-gray-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatNumber(summaryData.inventory.total_products)}</div>
                                <p className="text-xs text-muted-foreground dark:text-gray-400 flex items-center">
                                    {t('dashboard:viewProducts')}
                                     <ArrowRight className="inline h-3 w-3 ms-1 opacity-70"/>
                                 </p>
                            </CardContent>
                        </Card>

                    </div> {/* End Summary Cards Grid */}

                    {/* --- Low Stock Sample Display (If any) --- */}
                    {summaryData.inventory.low_stock_count > 0 && summaryData.inventory.low_stock_sample && (
                        <Card className="mt-6 dark:bg-gray-900 dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-md font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-100">
                                    <ListChecks className="h-5 w-5 text-orange-500 dark:text-orange-400"/>
                                    {t('dashboard:lowStockItemsTitle')}
                                </CardTitle>
                                <CardDescription className="dark:text-gray-400">
                                    {t('dashboard:lowStockItemsDesc')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {Array.isArray(summaryData.inventory.low_stock_sample) && summaryData.inventory.low_stock_sample.length > 0 ? (
                                    <ul className="list-disc ps-5 text-sm text-muted-foreground dark:text-gray-300 space-y-1">
                                        {summaryData.inventory.low_stock_sample.map((item) => (
                                            <li key={item.id || item.name} className="hover:text-primary">
                                                <RouterLink to={`/products/${item.id}/edit`}> {/* Link to product edit or view */}
                                                    {item.name} ({t('dashboard:remainingStock', { count: formatNumber(item.stock_quantity) })})
                                                </RouterLink>
                                            </li>
                                        ))}
                                    </ul>
                                ) : typeof summaryData.inventory.low_stock_sample === 'object' && Object.keys(summaryData.inventory.low_stock_sample).length > 0 ? (
                                     <ul className="list-disc ps-5 text-sm text-muted-foreground dark:text-gray-300 space-y-1">
                                         {Object.entries(summaryData.inventory.low_stock_sample).map(([quantity, name], index) => (
                                              <li key={index}>
                                                  {name} ({t('dashboard:remainingStock', { count: formatNumber(Number(quantity)) })})
                                              </li>
                                         ))}
                                     </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground dark:text-gray-400">{t('common:noData')}</p>
                                )}

{summaryData.inventory.low_stock_count > (summaryData.inventory.low_stock_sample?.length || 0) && (
                                    <Button variant="link" asChild className="ps-0 h-auto pt-3 text-xs">
                                        <RouterLink to="/products?low_stock=true">{t('dashboard:viewAllLowStock')}</RouterLink>
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    )}

                   

                </>
             )}
        </div>
    );
};

export default DashboardPage;