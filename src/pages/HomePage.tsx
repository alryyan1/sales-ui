// src/pages/HomePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Package,
    Users,
    ShoppingCart,
    CircleDollarSign,
    TrendingUp,
    AlertTriangle,
} from 'lucide-react';

// API Client & Error Helpers
import apiClient, { getErrorMessage } from '@/lib/axios';
import { formatCurrency, formatNumber } from '@/constants';
import settingService, { AppSettings } from '@/services/settingService';

// --- Types ---
interface SalesSummary {
    today_amount: number;
    this_month_amount: number;
    today_count: number;
    this_month_count: number;
}

interface PurchasesSummary {
    this_month_amount: number;
    this_month_count: number;
}

interface InventorySummary {
    total_products: number;
    low_stock_count: number;
    out_of_stock_count: number;
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
}

// --- Component ---
const HomePage: React.FC = () => {
    const { t } = useTranslation(['dashboard', 'common', 'home']);
    
    // --- State ---
    const [summaryData, setSummaryData] = useState<DashboardSummaryData | null>(null);
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- Data Fetching ---
    const fetchSummary = useCallback(async () => {
        try {
            const response = await apiClient.get<{ data: DashboardSummaryData }>('/dashboard/summary');
            setSummaryData(response.data.data);
        } catch (err) {
            console.error("Failed to fetch dashboard summary:", err);
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            toast.error(t('common:error'), { description: errorMsg });
        }
    }, [t]);

    const fetchSettings = useCallback(async () => {
        try {
            const settingsData = await settingService.getSettings();
            setSettings(settingsData);
        } catch (err) {
            console.error("Failed to fetch settings:", err);
            // Don't show error toast for settings, just use defaults
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);
            
            // Fetch both summary and settings in parallel
            await Promise.all([fetchSummary(), fetchSettings()]);
            
            setIsLoading(false);
        };
        
        loadData();
    }, [fetchSummary, fetchSettings]);

    // --- Helper Functions ---
    const formatCurrencyWithSettings = (value: number) => {
        return formatCurrency(
            Math.round(value), // Convert to integer
            undefined, // Use browser locale
            settings?.currency_symbol || 'USD',
            {
                minimumFractionDigits: 0, // No decimal places
                maximumFractionDigits: 0  // No decimal places
            }
        );
    };

    const formatInteger = (value: number) => {
        return formatNumber(Math.round(value), 0); // 0 decimal places for integers
    };

    // --- Loading State UI ---
    const renderSkeletons = () => (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
                <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );

    // --- Error State UI ---
    if (error && !isLoading) {
        return (
            <div className="container mx-auto p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    // --- Main Content ---
  return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {t('home:welcomeMessage', 'Welcome to Sales Management System')}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {t('home:subtitle', 'Your comprehensive solution for managing sales, inventory, and business operations')}
                </p>
            </div>

            {isLoading ? (
                renderSkeletons()
            ) : summaryData ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Sales Today */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('dashboard:salesToday', 'Sales Today')}
                            </CardTitle>
                            <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {formatCurrencyWithSettings(summaryData.sales.today_amount)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatInteger(summaryData.sales.today_count)} {t('dashboard:transactions', 'transactions')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Sales This Month */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('dashboard:salesThisMonth', 'Sales This Month')}
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {formatCurrencyWithSettings(summaryData.sales.this_month_amount)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatInteger(summaryData.sales.this_month_count)} {t('dashboard:transactions', 'transactions')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Purchases This Month */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('dashboard:purchasesThisMonth', 'Purchases This Month')}
                            </CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">
                                {formatCurrencyWithSettings(summaryData.purchases.this_month_amount)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatInteger(summaryData.purchases.this_month_count)} {t('dashboard:transactions', 'transactions')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Products */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('dashboard:totalProducts', 'Total Products')}
                            </CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600">
                                {formatInteger(summaryData.inventory.total_products)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('dashboard:inInventory', 'in inventory')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Low Stock Alert */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('dashboard:lowStock', 'Low Stock')}
                            </CardTitle>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {formatInteger(summaryData.inventory.low_stock_count)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('dashboard:productsNeedRestocking', 'products need restocking')}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Total Clients */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {t('dashboard:totalClients', 'Total Clients')}
                            </CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-indigo-600">
                                {formatInteger(summaryData.entities.total_clients)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t('dashboard:registeredClients', 'registered clients')}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            ) : null}

            {/* Company Information */}
            {settings && (
                <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                        {t('home:companyInfo', 'Company Information')}
                    </h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                {settings.company_name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {settings.company_address}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('home:phone', 'Phone')}: {settings.company_phone}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {t('home:email', 'Email')}: {settings.company_email}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
  );
};

export default HomePage;