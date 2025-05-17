// src/components/sales/terminal/ActionsLane.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog"; // Added DialogFooter
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // For product search results
import {
  PlusCircle,
  RefreshCw,
  Search,
  Package,
  Loader2,
  ExternalLink,
  BarChart2,
  X,
  AlertCircle,
  Printer,
} from "lucide-react";
import apiClient from "@/lib/axios";
import { Product } from "@/services/productService"; // Make sure Product type is correctly imported
import { formatCurrency, formatNumber } from "@/constants";
import { useAuth } from "@/context/AuthContext"; // To get current user for stats (if not implicitly handled by backend)
import { toast } from "sonner"; // For potential errors during quick search
import { Link as RouterLink } from "react-router-dom"; // For linking product names
import { FormLabel } from "@/components/ui/form";


// src/components/sales/terminal/ActionsLane.tsx or shared types file

interface SalesTerminalSummary {
    total_sales_amount_today: number;
    sales_count_today: number;
    payments_today_by_method: Record<string, number>; // e.g., { cash: 150.00, visa: 200.50 }
    // items_sold_today?: number;
}
interface ActionsLaneProps {
  onNewSale: () => void;
  onRefreshSalesList?: () => void; // Optional callback to refresh parent's sales list
  disabled?: boolean; // Disable buttons if main workspace is loading heavily
}

export const ActionsLane: React.FC<ActionsLaneProps> = ({
  onNewSale,
  onRefreshSalesList,
  disabled,
}) => {
  const { t } = useTranslation(["sales", "common", "products"]);
  const { user } = useAuth();

  // --- State for Today's Summary & Dialog ---
  const [terminalSummary, setTerminalSummary] =
    useState<SalesTerminalSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isSummaryDialogOpen, setIsSummaryDialogOpen] = useState(false);

  // --- State for Quick Product Lookup ---
  const [quickSearchTerm, setQuickSearchTerm] = useState("");
  const [quickSearchResults, setQuickSearchResults] = useState<Product[]>([]);
  const [isQuickSearchLoading, setIsQuickSearchLoading] = useState(false);
  const quickSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);
    // --- State for Print Last Receipt ---
    const [isPrintLastReceiptModalOpen, setIsPrintLastReceiptModalOpen] = useState(false);
    const [lastReceiptPdfUrl, setLastReceiptPdfUrl] = useState<string | null>(null);
    const [loadingLastReceipt, setLoadingLastReceipt] = useState(false);
    const [lastSaleIdToPrint, setLastSaleIdToPrint] = useState<number | null>(null);
const handlePrintLastReceipt = async () => {
        setLoadingLastReceipt(true);
        setLastReceiptPdfUrl(null);
        setLastSaleIdToPrint(null); // Reset
        setIsPrintLastReceiptModalOpen(true); // Open modal to show loader

        try {
            // 1. Get the last completed sale ID
            const idResponse = await apiClient.get<{ data: { last_sale_id: number | null } }>('/sales-print/last-completed-id');
            const lastId = idResponse.data.data?.last_sale_id;

            if (!lastId) {
                toast.info(t('sales:noLastSaleToPrint')); // Add key
                setIsPrintLastReceiptModalOpen(false);
                setLoadingLastReceipt(false);
                return;
            }
            setLastSaleIdToPrint(lastId);

            // 2. Fetch the thermal PDF for that ID
            const pdfResponse = await apiClient.get(`/sales/${lastId}/thermal-invoice-pdf`, {
                responseType: 'blob',
            });
            const file = new Blob([pdfResponse.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            setLastReceiptPdfUrl(fileURL);

        } catch (error) {
            console.error("Error printing last receipt:", error);
            toast.error(t('common:error'), { description: t('sales:errorPrintingLastReceipt') }); // Add key
            setIsPrintLastReceiptModalOpen(false); // Close modal on error
        } finally {
            setLoadingLastReceipt(false);
        }
    };

    const handleClosePrintLastReceiptModal = () => {
        setIsPrintLastReceiptModalOpen(false);
        if (lastReceiptPdfUrl) {
            URL.revokeObjectURL(lastReceiptPdfUrl); // Clean up blob URL
            setLastReceiptPdfUrl(null);
        }
    };
  // Fetch today's summary
  const fetchTerminalSummary = useCallback(async () => {
    if (!user) return;
    setLoadingSummary(true);
    try {
      const response = await apiClient.get<{ data: SalesTerminalSummary }>(
        "/dashboard/sales-terminal-summary"
      );
      setTerminalSummary(response.data.data);
    } catch (error) {
      console.error("Error fetching sales terminal summary:", error);
      toast.error(t("common:error"), {
        description: t("sales:errorFetchingSummary"),
      });
      setTerminalSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [user, t]);

  const handleOpenSummaryDialog = () => {
    setIsSummaryDialogOpen(true);
    // Fetch summary if not already loaded or to refresh
    fetchTerminalSummary();
  };

  // Debounced search for quick product lookup
  useEffect(() => {
    if (quickSearchDebounceRef.current)
      clearTimeout(quickSearchDebounceRef.current);
    if (quickSearchTerm.trim().length > 1) {
      // Only search if term is > 1 char
      quickSearchDebounceRef.current = setTimeout(async () => {
        setIsQuickSearchLoading(true);
        try {
          const response = await apiClient.get<{ data: Product[] }>(
            `/products/autocomplete?search=${encodeURIComponent(
              quickSearchTerm
            )}&limit=10`
          ); // Limit results
          setQuickSearchResults(response.data.data ?? response.data);
        } catch (error) {
          console.error("Quick product search error:", error);
          setQuickSearchResults([]);
          toast.error(t("common:error"), {
            description: t("products:fetchError"),
          });
        } finally {
          setIsQuickSearchLoading(false);
        }
      }, 300); // 300ms debounce
    } else {
      setQuickSearchResults([]); // Clear results if search term is short
      setIsQuickSearchLoading(false); // Ensure loading is off
    }
    return () => {
      if (quickSearchDebounceRef.current)
        clearTimeout(quickSearchDebounceRef.current);
    };
  }, [quickSearchTerm, t]);

  return (
    <div className="space-y-3 w-full h-full flex flex-col p-2 md:p-3">
    <Button
      onClick={onNewSale}
      disabled={disabled}
      className="w-full flex justify-center items-center"
      size="lg"
    >
      <PlusCircle className="h-6 w-6" />
    </Button>

      {onRefreshSalesList && (
        <Button
          onClick={onRefreshSalesList}
          variant="outline"
          disabled={disabled}
          className="w-full"
        >
          <RefreshCw className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" />
          {t("common:refreshList")}
        </Button>
      )}

            {/* --- Print Last Receipt Button --- */}
            <Button
                variant="outline"
                className="w-full flex justify-center items-center bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={handlePrintLastReceipt}
                disabled={disabled || loadingLastReceipt}
            >
                {loadingLastReceipt ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <Printer className="h-5 w-5" />
                )}
            </Button>
      {/* Button to Open Summary Dialog */}
     {/* Button to Open Summary Dialog */}
            <Dialog open={isSummaryDialogOpen} onOpenChange={setIsSummaryDialogOpen}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="w-full bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                        onClick={handleOpenSummaryDialog}
                        disabled={disabled}
                    >
                        <BarChart2 className="me-2 h-4 w-4 rtl:ms-2 rtl:me-0" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg text-gray-900 dark:text-gray-100">{t('sales:todaysActivity')}</DialogTitle>
                        <CardDescription>{t('sales:summaryForUser', { name: user?.name || t('common:currentUser') })}</CardDescription> {/* Add key */}
                    </DialogHeader>
                    <div className="py-4 space-y-4"> {/* Added space-y-4 */}
                        {loadingSummary ? (
                            <div className="flex items-center justify-center p-6 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin me-2"/> {t('common:loading')}...
                            </div>
                        ) : terminalSummary ? (
                            <>
                                {/* Sales Summary */}
                                <Card className="border-0 shadow-none p-0 m-0"> {/* Simpler presentation inside dialog */}
                                    <CardContent className="text-sm space-y-2 p-0">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('sales:totalSalesToday')}:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(terminalSummary.total_sales_amount_today)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">{t('sales:salesCountToday')}:</span>
                                            <span className="font-medium text-gray-800 dark:text-gray-200">{formatNumber(terminalSummary.sales_count_today)}</span>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Separator className="my-3 dark:bg-gray-700" />

                                {/* Payments by Method Summary */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">{t('sales:paymentsByMethodToday')}</h4> {/* Add key */}
                                    {Object.keys(terminalSummary.payments_today_by_method || {}).length > 0 ? (
                                        <div className="space-y-1 text-sm">
                                            {Object.entries(terminalSummary.payments_today_by_method).map(([method, total]) => (
                                                <div key={method} className="flex justify-between">
                                                    <span className="text-muted-foreground">
                                                        {t(`paymentMethods:${method}`, { defaultValue: method })}: {/* Translate method name */}
                                                    </span>
                                                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatCurrency(total)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-xs">{t('sales:noPaymentsToday')}</p> /* Add key */
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-muted-foreground text-sm text-center py-4">{t('common:noDataAvailable')}</p>
                        )}
                    </div>
                     <DialogFooter className="sm:justify-end border-t pt-4 dark:border-gray-700">
                        <DialogClose asChild>
                            <Button type="button" variant="outline">{t('common:close')}</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- Print Last Receipt Modal --- */}
            <Dialog open={isPrintLastReceiptModalOpen} onOpenChange={setIsPrintLastReceiptModalOpen}>
                 {/* No DialogTrigger here, opened programmatically */}
                <DialogContent className="sm:max-w-[350px] md:max-w-[450px] p-0 aspect-[80/200] overflow-hidden dark:bg-gray-800">
                    <DialogHeader className="p-4 border-b dark:border-gray-700 flex flex-row justify-between items-center">
                        <DialogTitle className="text-lg text-gray-900 dark:text-gray-100">
                            {t('sales:lastReceiptTitle')} {/* Add key */} {lastSaleIdToPrint && `#${lastSaleIdToPrint}`}
                        </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" onClick={handleClosePrintLastReceiptModal} className="h-7 w-7">
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className="p-1 h-[calc(100%-60px)]"> {/* Adjust height if needed */}
                        {loadingLastReceipt && !lastReceiptPdfUrl && ( // Show loader only if PDF isn't ready
                            <div className="flex justify-center items-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        )}
                        {lastReceiptPdfUrl && !loadingLastReceipt && (
                            <iframe
                                src={lastReceiptPdfUrl}
                                title={t('sales:lastReceiptTitle')}
                                className="w-full h-full border-0"
                                onLoad={() => console.log("Thermal PDF loaded in iframe")}
                                onError={() => console.error("Error loading thermal PDF in iframe")}
                            />
                        )}
                        {!loadingLastReceipt && !lastReceiptPdfUrl && lastSaleIdToPrint && ( // Error specific to PDF fetch for a valid ID
                            <div className="flex justify-center items-center h-full text-muted-foreground p-4 text-center">
                                {t('sales:errorLoadingPdfPreview')}
                            </div>
                        )}
                         {/* Case where no last sale ID was found initially */}
                         {!loadingLastReceipt && !lastReceiptPdfUrl && !lastSaleIdToPrint && !isSummaryDialogOpen && (
                             <div className="flex justify-center items-center h-full text-muted-foreground p-4 text-center">
                                {t('sales:noLastSaleToPrintMessage')} {/* Add key */}
                            </div>
                         )}
                    </div>
                    {/* Optional: Add explicit print button inside modal footer if browser print is not obvious */}
                     {/* <DialogFooter className="p-4 border-t sm:justify-center">
                         <Button onClick={() => {
                             const iframe = document.querySelector('iframe[title="' + t('sales:lastReceiptTitle') + '"]');
                             if (iframe && iframe.contentWindow) {
                                 iframe.contentWindow.print();
                             }
                         }} disabled={!lastReceiptPdfUrl || loadingLastReceipt}>
                             <Printer className="me-2 h-4 w-4" /> Print
                         </Button>
                     </DialogFooter> */}
                </DialogContent>
            </Dialog>

      <Separator className="my-3 dark:bg-gray-700" />

      {/* Quick Product Lookup
      <div className="space-y-2">
        <FormLabel
          htmlFor="quickProductSearch"
          className="text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {t("products:quickSearch")}
        </FormLabel>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground rtl:right-2.5 rtl:left-auto" />
          <Input
            id="quickProductSearch"
            type="search"
            placeholder={t("products:searchByNameOrSku")}
            className="ps-9 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
            value={quickSearchTerm}
            onChange={(e) => setQuickSearchTerm(e.target.value)}
          />
        </div>
        {isQuickSearchLoading && (
          <div className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
            <Loader2 className="h-3 w-3 animate-spin" /> {t("common:searching")}
            ...
          </div>
        )}
        {quickSearchResults.length > 0 && !isQuickSearchLoading && (
          <ScrollArea className="h-48 border rounded-md dark:border-gray-700 mt-1 bg-background dark:bg-gray-800">
            <div className="p-1 text-xs">
              {quickSearchResults.map((p) => (
                <div
                  key={p.id}
                  className="p-1.5 rounded hover:bg-accent dark:hover:bg-gray-700/70 space-y-0.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {p.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      asChild
                    >
                      <RouterLink
                        to={`/products/${p.id}/edit`}
                        target="_blank"
                        aria-label={t("common:viewDetails") || "View Details"}
                      >
                        <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                      </RouterLink>
                    </Button>
                  </div>
                  <div className="flex justify-between text-muted-foreground dark:text-gray-400">
                    <span>SKU: {p.sku || "N/A"}</span>
                    <span>
                      Price:
                      {formatCurrency(
                        p.suggested_sale_price_per_sellable_unit || p.sale_price
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground dark:text-gray-400">
                    <span>
                      Stock: {formatNumber(p.stock_quantity)}
                      {p.sellable_unit_name || ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        )}
        {!isQuickSearchLoading &&
          quickSearchTerm.length > 1 &&
          quickSearchResults.length === 0 && (
            <p className="text-xs text-muted-foreground p-2">
              {t("common:noResultsFoundSimple")}
            </p>
          )}
      </div> */}

      {/* Spacer to push content below to bottom if needed */}
      <div className="flex-grow"></div>

      {/* Optional: Settings/Logout at bottom (can be moved to user dropdown in main header) */}
    </div>
  );
};
