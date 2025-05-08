// src/pages/reports/ProfitLossReportPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Filter, X, AlertCircle, ArrowLeft, TrendingUp, TrendingDown, Minus, CalendarIcon } from 'lucide-react';

// API Client & Types
import apiClient, { getErrorMessage } from '@/lib/axios';
// Helpers
import { formatNumber } from '@/constants';
import dayjs from 'dayjs';

// --- Zod Schema for Filter Form ---
const profitLossFilterSchema = z.object({
    startDate: z.date({ required_error: "validation:required" }), // Dates are required for P/L
    endDate: z.date({ required_error: "validation:required" }),
    // Optional filters
    // productId: z.string().nullable().optional(),
    // clientId: z.string().nullable().optional(),
}).refine(data => data.endDate >= data.startDate, {
    message: "validation:endDateAfterStart",
    path: ["endDate"],
});

type ProfitLossFilterValues = z.infer<typeof profitLossFilterSchema>;

// --- Type for Report Data ---
interface ProfitLossData {
    start_date: string;
    end_date: string;
    filters: Record<string, any>;
    revenue: number;
    cost_of_goods_sold: number;
    gross_profit: number;
}

// --- Component ---
const ProfitLossReportPage: React.FC = () => {
    const { t } = useTranslation(['reports', 'common', 'validation']);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // --- State ---
    const [reportData, setReportData] = useState<ProfitLossData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Add state for optional filters (products, clients) if needed

    // --- Form ---
    const form = useForm<ProfitLossFilterValues>({
        resolver: zodResolver(profitLossFilterSchema),
        defaultValues: {
            // Default to current month
            startDate: searchParams.get('startDate') ? parseISO(searchParams.get('startDate')!) : startOfMonth(new Date()),
            endDate: searchParams.get('endDate') ? parseISO(searchParams.get('endDate')!) : new Date(),
            // clientId: searchParams.get('clientId') || null,
            // productId: searchParams.get('productId') || null,
        },
    });
    const { control, handleSubmit, reset, formState } = form;

    // --- Fetch Report Data ---
    const fetchReport = useCallback(async (filters: ProfitLossFilterValues) => {
        setIsLoading(true); setError(null); setReportData(null); // Clear previous data
        console.log("Fetching P/L Report:", filters);
        try {
            const params = new URLSearchParams();
            params.append('start_date', format(filters.startDate, 'yyyy-MM-dd'));
            params.append('end_date', format(filters.endDate, 'yyyy-MM-dd'));
            // if (filters.clientId) params.append('client_id', filters.clientId);
            // if (filters.productId) params.append('product_id', filters.productId);

            const response = await apiClient.get<{ data: ProfitLossData }>(`/reports/profit-loss?${params.toString()}`);
            setReportData(response.data.data);
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            toast.error(t('common:error'), { description: errorMsg });
        } finally {
            setIsLoading(false);
        }
    }, [t]); // Dependency 't' for toast

    // --- Effect to Fetch Report When URL Params Change ---
    const currentFilters = useMemo(() => ({
        startDate: searchParams.get('startDate') ? parseISO(searchParams.get('startDate')!) : startOfMonth(new Date()),
        endDate: searchParams.get('endDate') ? parseISO(searchParams.get('endDate')!) : new Date(),
        // clientId: searchParams.get('clientId') || null,
        // productId: searchParams.get('productId') || null,
    }), [searchParams]);

    useEffect(() => {
         reset(currentFilters); // Sync form with URL
         // Automatically fetch if dates are valid according to schema
         const validationResult = profitLossFilterSchema.safeParse(currentFilters);
         if (validationResult.success) {
             fetchReport(validationResult.data);
         } else {
             // Clear results if current URL params are invalid, maybe show validation error
             setReportData(null);
             // Optionally set an error state based on validationResult.error
             console.warn("Initial URL params invalid for P/L report:", validationResult.error.flatten());
         }
    }, [currentFilters, fetchReport, reset]); // Fetch when filters from URL change

    // --- Filter Form Submit Handler ---
    const onFilterSubmit: SubmitHandler<ProfitLossFilterValues> = (data) => {
        console.log("Applying P/L filters:", data);
        const newParams = new URLSearchParams();
        newParams.set('startDate', format(data.startDate, 'yyyy-MM-dd'));
        newParams.set('endDate', format(data.endDate, 'yyyy-MM-dd'));
        // if (data.clientId) newParams.set('clientId', data.clientId);
        // if (data.productId) newParams.set('productId', data.productId);
        setSearchParams(newParams); // Update URL, triggers useEffect -> fetchReport
    };

    // --- Clear Filters Handler ---
    const clearFilters = () => {
        const defaultFormValues = { startDate: startOfMonth(new Date()), endDate: new Date() /*, clientId: null, productId: null */ };
        reset(defaultFormValues);
        setSearchParams({}); // Clear URL params (triggers refetch via useEffect)
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
            {/* Header */}
            <div className="flex items-center mb-6 gap-2">
                <Button variant="outline" size="icon" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
                    {t('reports:profitLossReportTitle')}
                </h1>
            </div>

             {/* Filter Form Card */}
             <Card className="dark:bg-gray-900 mb-6">
                 <CardHeader><CardTitle className="text-lg">{t('common:filters')}</CardTitle></CardHeader>
                 <CardContent>
                    <Form {...form}>
                         <form onSubmit={handleSubmit(onFilterSubmit)}>
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                                 {/* Start Date */}
                                 <FormField control={control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>{t('common:startDate')}*</FormLabel> <Popover> <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="me-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span>{t('common:pickDate')}</span>} </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus /></PopoverContent> </Popover> <FormMessage>{formState.errors.startDate?.message ? t(formState.errors.startDate.message) : null}</FormMessage> </FormItem> )} />
                                 {/* End Date */}
                                 <FormField control={control} name="endDate" render={({ field }) => ( <FormItem className="flex flex-col"> <FormLabel>{t('common:endDate')}*</FormLabel> <Popover> <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}> <CalendarIcon className="me-2 h-4 w-4" /> {field.value ? format(field.value, "PPP") : <span>{t('common:pickDate')}</span>} </Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} initialFocus /></PopoverContent> </Popover> <FormMessage>{formState.errors.endDate?.message ? t(formState.errors.endDate.message as string) : null}</FormMessage> </FormItem> )} />
                                 {/* Add Client/Product filters here if needed */}
                                 {/* Filter/Clear Buttons */}
                                 <div className="flex justify-start sm:justify-end gap-2 md:col-start-3"> {/* Align buttons */}
                                     <Button type="button" variant="ghost" onClick={clearFilters} disabled={isLoading}> <X className="me-2 h-4 w-4" />{t('common:clearFilters')} </Button>
                                     <Button type="submit" disabled={isLoading}> {isLoading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Filter className="me-2 h-4 w-4" />} {t('reports:generateReport')} </Button> {/* Use specific button text */}
                                 </div>
                             </div>
                         </form>
                     </Form>
                 </CardContent>
             </Card>

            {/* Report Results Section */}
            {isLoading && ( <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div> )}
            {!isLoading && error && ( <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('common:error')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> )}
            {!isLoading && !error && reportData && (
                <Card className="dark:bg-gray-900">
                    <CardHeader>
                        <CardTitle>{t('reports:profitLossSummary')}</CardTitle> {/* Add key */}
                        <CardDescription>{t('reports:forPeriod', { start: dayjs(reportData.start_date).format('YYYY-MM-DD'), end: dayjs(reportData.end_date).format('YYYY-MM-DD') })}</CardDescription> {/* Add key */}
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                            <span className="text-muted-foreground">{t('reports:totalRevenue')}</span> {/* Add key */}
                            <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1"> <TrendingUp className='h-4 w-4'/> {formatNumber(reportData.revenue)}</span>
                        </div>
                         <div className="flex justify-between items-center border-b pb-2 dark:border-gray-700">
                            <span className="text-muted-foreground">{t('reports:totalCOGS')}</span> {/* Add key */}
                            <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1"> <TrendingDown className='h-4 w-4'/> {formatNumber(reportData.cost_of_goods_sold)}</span>
                        </div>
                         <div className="flex justify-between items-center pt-2">
                             <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('reports:grossProfit')}</span> {/* Add key */}
                             <span className={`text-lg font-bold flex items-center gap-1 ${reportData.gross_profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                 <Minus className={cn('h-4 w-4', reportData.gross_profit >= 0 && 'hidden')} /> {/* Show minus only if negative */}
                                 {formatNumber(reportData.gross_profit)}
                            </span>
                        </div>
                        {/* Optionally add Total Purchase Cost if calculated and needed */}
                         {/* <div className="flex justify-between items-center border-t pt-2 mt-2 dark:border-gray-700">
                             <span className="text-sm text-muted-foreground">{t('reports:totalPurchaseCost')}</span>
                             <span className="text-sm font-medium">{formatCurrency(reportData.total_purchase_cost)}</span>
                         </div> */}
                    </CardContent>
                </Card>
            )}
             {!isLoading && !error && !reportData && (
                  <p className="text-center text-muted-foreground py-10">{t('reports:selectDatePrompt')}</p> // Prompt to select dates if no data yet // Add key
             )}
        </div>
    );
};

export default ProfitLossReportPage;