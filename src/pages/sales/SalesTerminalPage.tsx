// src/pages/sales/SalesTerminalPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { ScrollArea } from "@/components/ui/scroll-area"; // For sales lane
import { Loader2, AlertCircle, PackageSearch } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Services and Types
import saleService, {
  Sale,
  SaleItem,
} from "../../services/saleService"; // Assuming Sale includes items_count and client_name
import { useAuthorization } from "@/hooks/useAuthorization"; // For permissions

// Child Components (to be created/imported)
import { SalesLane } from "../../components/sales/terminal/SalesLane";
import { SaleWorkspace } from "../../components/sales/terminal/SaleWorkspace"; // This will be complex
import { ActionsLane } from "../../components/sales/terminal/ActionsLane";
import { formatDate, parseISO } from "date-fns";
import dayjs from "dayjs";

// Type for the active sale data in the workspace (can be partial for new sale)
export type ActiveSaleDataType = Partial<Sale> & {
  items: SaleItem[];
  payments: PaymentItem[];
}; // Refine this

const SalesTerminalPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common"]);
  const { user } = useAuthorization(); // Get current user for filtering sales

  // --- State ---
  const [todaySalesList, setTodaySalesList] = useState<Sale[]>([]);
  const [isLoadingSalesList, setIsLoadingSalesList] = useState(true);
  const [activeSaleId, setActiveSaleId] = useState<number | "new" | null>(null); // 'new' for a fresh form
  const [activeSaleData, setActiveSaleData] =
    useState<ActiveSaleDataType | null>(null); // Data for the workspace form
  const [isLoadingActiveSale, setIsLoadingActiveSale] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // --- Fetch Today's Sales for the Lane ---
  const fetchTodaySales = useCallback(async () => {
    setIsLoadingSalesList(true);
    setListError(null);
    try {
      // Backend should filter by today and current user if applicable
      const response = await saleService.getSales(
        1,
        "",
        "",
        "",
        "",
        100,
        undefined,
        true,
        user?.id
      ); // page, search, status, start, end, limit, client, today_only, for_current_user
      setTodaySalesList(response.data); // Assuming getSales returns PaginatedResponse
    } catch (err) {
      const errorMsg = saleService.getErrorMessage(err);
      setListError(errorMsg);
      toast.error(t("common:error"), { description: errorMsg });
    } finally {
      setIsLoadingSalesList(false);
    }
  }, [t, user?.id]); // Add user?.id if filtering by user

  useEffect(() => {
    fetchTodaySales();
    // Optionally, set up a poller to refresh today's sales list periodically
    // const intervalId = setInterval(fetchTodaySales, 30000); // Refresh every 30 seconds
    // return () => clearInterval(intervalId);
  }, [fetchTodaySales]);

  // --- Handle Selecting a Sale from the Lane or Starting a New One ---
  const handleSelectSale = useCallback(
    async (saleId: number | "new") => {
      setActiveSaleId(saleId);
      setWorkspaceError(null);
      if (saleId === "new") {
        // Prepare a blank template for a new sale
        setActiveSaleData({
          // Default values for a new sale, RHF in Workspace will handle form defaults
          client_id: null,
          sale_date: formatDate(new Date(), "yyyy-MM-dd"), // Default to today, API expects string
          status: "pending", // Or 'draft'
          items: [],
          payments: [],
        });
        setIsLoadingActiveSale(false);
      } else if (saleId !== null) {
        setIsLoadingActiveSale(true);
        try {
          const saleDetails = await saleService.getSale(saleId);
          setActiveSaleData(saleDetails);
        } catch (err) {
          const errorMsg = saleService.getErrorMessage(err);
          setWorkspaceError(errorMsg);
          toast.error(t("common:error"), {
            description: t("sales:errorLoadingSaleDetails", { id: saleId }),
          });
          setActiveSaleData(null); // Clear on error
        } finally {
          setIsLoadingActiveSale(false);
        }
      } else {
        setActiveSaleData(null); // No sale selected
      }
    },
    [t]
  );

  // --- Handle Saving/Updating a Sale from the Workspace ---
  const handleSaveSale = async (
    formData: any,
    saleIdToUpdate?: number | null
  ): Promise<boolean> => {
    // Returns true on success
    // formData will come from RHF in SaleWorkspace
    // saleIdToUpdate will be activeSaleId if editing
    setIsLoadingActiveSale(true); // Indicate processing
    setWorkspaceError(null);
    try {
      let savedSale: Sale;
      if (saleIdToUpdate && saleIdToUpdate !== "new") {
        savedSale = await saleService.updateSale(
          saleIdToUpdate as number,
          {...formData,sale_date:dayjs(formData.sale_data).format('YYYY-MM-DD'),payments:  formData.payments?.map(p => {
                // Ensure p.payment_date is a Date object before formatting
                // RHF with <Calendar> inside <Controller> should provide it as a Date object
                if (!(p.payment_date instanceof Date)) {
                    console.error("Payment date is not a Date object for payment:", p);
                    // Handle this error appropriately, maybe skip this payment or set a default
                    // For now, let's try to parse it if it's a string, or throw error
                    try {
                        // This is a fallback, ideally it should always be a Date object from the form
                        p.payment_date = typeof p.payment_date === 'string' ? parseISO(p.payment_date) : new Date(p.payment_date);
                    } catch (dateParseError) {
                        console.error("Could not parse payment date:", p.payment_date, dateParseError);
                        // Set a default or skip this payment if date is critical and unparseable
                        // For now, just let it potentially fail API validation if it remains invalid
                    }
                }

                return {
                    id: p.id,
                    method: p.method,
                    amount: Number(p.amount),
                    payment_date: formatDate(p.payment_date as Date, "yyyy-MM-dd"), // <--- FORMAT PAYMENT DATE
                    reference_number: p.reference_number || null,
                    notes: p.notes || null,
                };
            }) || [],}
        ); // Needs UpdateSaleData type
      } else {
        savedSale = await saleService.createSale({...formData,sale_date:dayjs(formData.sale_data).format('YYYY-MM-DD'),payments:  formData.payments?.map(p => {
                // Ensure p.payment_date is a Date object before formatting
                // RHF with <Calendar> inside <Controller> should provide it as a Date object
                if (!(p.payment_date instanceof Date)) {
                    console.error("Payment date is not a Date object for payment:", p);
                    // Handle this error appropriately, maybe skip this payment or set a default
                    // For now, let's try to parse it if it's a string, or throw error
                    try {
                        // This is a fallback, ideally it should always be a Date object from the form
                        p.payment_date = typeof p.payment_date === 'string' ? parseISO(p.payment_date) : new Date(p.payment_date);
                    } catch (dateParseError) {
                        console.error("Could not parse payment date:", p.payment_date, dateParseError);
                        // Set a default or skip this payment if date is critical and unparseable
                        // For now, just let it potentially fail API validation if it remains invalid
                    }
                }

                return {
                    id: p.id,
                    method: p.method,
                    amount: Number(p.amount),
                    payment_date: formatDate(p.payment_date as Date, "yyyy-MM-dd"), // <--- FORMAT PAYMENT DATE
                    reference_number: p.reference_number || null,
                    notes: p.notes || null,
                };
            }) || [],}); // Needs CreateSaleData type
      }
      toast.success(t("common:success"), {
        description: t("sales:saveSuccess"),
      });
      fetchTodaySales(); // Refresh the sales lane
      handleSelectSale(savedSale.id); // Load the newly saved/updated sale into workspace
      return true;
    } catch (err: any) {
      const generalError = saleService.getErrorMessage(err);
      const apiErrors = saleService.getValidationErrors(err);
      toast.error(t("common:error"), { description: generalError });
      setWorkspaceError(generalError); // Show error in workspace
      // RHF in SaleWorkspace should handle field-specific errors if apiErrors are mapped
      return false;
    } finally {
      setIsLoadingActiveSale(false);
    }
  };

  // --- Render Page ---
  return (
    // Full height, 3-column layout on larger screens
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50 dark:bg-gray-950">
      {/* Left Section: Sales Lane */}
      <aside className="w-full md:w-1/4 lg:w-1/5 border-e dark:border-gray-800 flex flex-col">
        <div className="p-3 border-b dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {t("sales:todaysSales")}
          </h2>
          {/* Add key */}
        </div>
        {isLoadingSalesList && (
          <div className="flex-grow flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin me-2" />
            {t("common:loading")}...
          </div>
        )}
        {!isLoadingSalesList && listError && (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertDescription>{listError}</AlertDescription>
            </Alert>
          </div>
        )}
        {!isLoadingSalesList && !listError && (
          <ScrollArea className="flex-grow">
            <SalesLane
              sales={todaySalesList}
              activeSaleId={activeSaleId}
              onSelectSale={handleSelectSale}
            />
          </ScrollArea>
        )}
      </aside>

      {/* Middle Section: Sale Workspace */}
      <main className="flex-grow w-full md:w-1/2 lg:w-3/5 p-1 md:p-1 overflow-y-auto">
        {isLoadingActiveSale && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin me-2" />
            {t("common:loadingSale")} {/* Add key */}
          </div>
        )}
        {!isLoadingActiveSale && workspaceError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("common:error")}</AlertTitle>
            <AlertDescription>{workspaceError}</AlertDescription>
          </Alert>
        )}
        {!isLoadingActiveSale &&
          !workspaceError &&
          activeSaleId &&
          activeSaleData && (
            <SaleWorkspace
              key={activeSaleId === "new" ? "new-sale" : activeSaleId} // Force re-mount for new sale or different sale
              initialSaleData={activeSaleData}
              isEditMode={activeSaleId !== "new"}
              onSave={handleSaveSale}
              parentIsLoading={isLoadingActiveSale} // Pass loading state to workspace
            //   parentIsLoading={isSubmitting} //isLoading from RHF in workspace will be isSubmitting
            />
          )}
        {!isLoadingActiveSale && !activeSaleId && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PackageSearch className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t("sales:selectSaleOrCreateNew")}
            </p>
            {/* Add key */}
          </div>
        )}
      </main>

      {/* Right Section: Actions */}
      <aside className="w-full md:w-1/4 lg:w-[100px] border-s dark:border-gray-800 p-4 flex flex-col items-center md:items-start">
        <ActionsLane
          onNewSale={() => handleSelectSale("new")}
          disabled={isLoadingActiveSale || isLoadingSalesList}
        />
        {/* Optional: Quick Stats for Today */}
        {/* <div className="mt-auto text-xs text-muted-foreground">
                     <p>Total Sales Today: ...</p>
                     <p>Items Sold Today: ...</p>
                 </div> */}
      </aside>
    </div>
  );
};

export default SalesTerminalPage;
