// src/pages/sales/SalesReturnsPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// shadcn/ui Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Lucide Icons
import {
  Search,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  FileText,
  History,
  Undo2,
} from "lucide-react";

// Services and Types
import saleService, {
  Sale,
  SaleItem,
  CreateSaleReturnData,
  SaleReturnItemData,
} from "../../services/saleService";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { formatNumber } from "@/constants";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

const SalesReturnsPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common"]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  // Get saleId from query parameters
  const saleIdParam = searchParams.get("saleId");

  // Step 1: Search state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2-4: Selected sale and return data
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedItems, setSelectedItems] = useState<
    Record<
      number,
      {
        quantity: number;
        condition: "resellable" | "damaged";
        maxReturnable: number;
      }
    >
  >({});
  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [creditAction, setCreditAction] = useState<"refund" | "store_credit">(
    "refund"
  );

  // Current step tracking
  const currentStep = selectedSale
    ? Object.keys(selectedItems).length > 0
      ? 4
      : 3
    : searchQuery
    ? 2
    : 1;

  // Step 1: Search for sale
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: searchSale,
  } = useQuery({
    queryKey: ["search-sale", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return null;
      const result = await saleService.getSales(
        1,
        `search=${encodeURIComponent(searchQuery.trim())}`
      );
      return result.data || [];
    },
    enabled: false, // Manual trigger
    retry: false,
  });

  // Fetch sale by ID from query parameter
  const {
    data: saleFromParam,
    isLoading: isLoadingSaleFromParam,
    error: errorSaleFromParam,
  } = useQuery({
    queryKey: ["sale-by-id", saleIdParam],
    queryFn: async () => {
      if (!saleIdParam) return null;
      const saleId = Number(saleIdParam);
      if (isNaN(saleId)) return null;
      return await saleService.getSale(saleId);
    },
    enabled: !!saleIdParam && !selectedSale,
    retry: false,
  });

  // Fetch full sale details when a sale is selected
  const {
    data: saleDetails,
    isLoading: isLoadingDetails,
    error: saleError,
  } = useQuery({
    queryKey: ["sale-details", selectedSale?.id],
    queryFn: async () => {
      if (!selectedSale?.id) return null;
      return await saleService.getSale(selectedSale.id);
    },
    enabled: !!selectedSale?.id,
  });

  // Auto-select sale from query parameter
  useEffect(() => {
    if (saleFromParam && !selectedSale) {
      setSelectedSale(saleFromParam);
      setSearchQuery("");
      setInvoiceNumber("");
    }
  }, [saleFromParam, selectedSale]);

  // Show error if sale from param failed to load
  useEffect(() => {
    if (errorSaleFromParam && saleIdParam) {
      toast.error(t("sales:returnsPage.loadInvoiceFailed"));
    }
  }, [errorSaleFromParam, saleIdParam]);

  // Create return mutation
  const createReturnMutation = useMutation({
    mutationFn: async (data: CreateSaleReturnData) => {
      return await saleService.createSaleReturn(data);
    },
    onSuccess: () => {
      toast.success(t("sales:returnsPage.createReturnSuccess"));
      queryClient.invalidateQueries({ queryKey: ["sale-returns"] });
      // Reset form
      handleReset();
      navigate("/sales/returns");
    },
    onError: (error: unknown) => {
      const errorMsg =
        (error as { response?: { data?: { message?: string; errors?: Record<string, unknown[]> } } })?.response?.data?.message || t("sales:returnsPage.createReturnFailed");
      const errorData = (error as { response?: { data?: { errors?: Record<string, unknown[]> } } })?.response?.data?.errors;
      if (errorData) {
        const firstErr = Object.values(errorData)[0];
        if (Array.isArray(firstErr) && firstErr.length > 0) {
          toast.error(String(firstErr[0]));
        } else {
          toast.error(errorMsg);
        }
      } else {
        toast.error(errorMsg);
      }
    },
  });

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      toast.error(t("sales:returnsPage.enterInvoiceNumber"));
      return;
    }
    setSearchQuery(invoiceNumber.trim());
    setSelectedSale(null);
    setSelectedItems({});
    searchSale();
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setSelectedItems({});
    setSearchQuery("");
    setInvoiceNumber("");
  };

  const handleItemToggle = (item: SaleItem) => {
    if (!item.id) return;

    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[item.id!]) {
        delete newItems[item.id!];
      } else {
        // Calculate max returnable (considering already returned items)
        // For now, assume all quantity is returnable (backend will validate)
        newItems[item.id!] = {
          quantity: 1,
          condition: "resellable",
          maxReturnable: item.quantity,
        };
      }
      return newItems;
    });
  };

  const handleItemChange = (
    itemId: number,
    field: "quantity" | "condition",
    value: string | number
  ) => {
    setSelectedItems((prev) => {
      if (!prev[itemId]) return prev;
      const item = prev[itemId];
      if (field === "quantity") {
        const qty = Math.max(1, Math.min(item.maxReturnable, Number(value)));
        return {
          ...prev,
          [itemId]: { ...item, quantity: qty },
        };
      }
      // For condition, ensure it's a valid value
      const conditionValue = value === "resellable" || value === "damaged" 
        ? value 
        : "resellable" as "resellable" | "damaged";
      return {
        ...prev,
        [itemId]: { ...item, condition: conditionValue },
      };
    });
  };

  const calculateTotalRefund = (): number => {
    if (!saleDetails) return 0;
    let total = 0;
    Object.entries(selectedItems).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      const item = saleDetails.items?.find((i) => i.id === itemId);
      if (item) {
        total += Number(item.unit_price) * data.quantity;
      }
    });
    return total;
  };

  const handleSubmit = async () => {
    if (!saleDetails) return;

    const itemsToReturn: SaleReturnItemData[] = [];
    let isValid = true;

    // Build payload and validate
    Object.entries(selectedItems).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      const originalItem = saleDetails.items?.find((i) => i.id === itemId);

      if (!originalItem || !originalItem.id) {
        isValid = false;
        return;
      }

      if (data.quantity > data.maxReturnable) {
        toast.error(
          t("sales:returnsPage.returnQtyExceedsAvailable", { name: originalItem.product?.name || originalItem.product_name })
        );
        isValid = false;
        return;
      }

      if (data.quantity <= 0) {
        toast.error(
          t("sales:returnsPage.qtyMustBeGreaterThanZero", { name: originalItem.product?.name || originalItem.product_name })
        );
        isValid = false;
        return;
      }

      itemsToReturn.push({
        original_sale_item_id: originalItem.id,
        product_id: originalItem.product_id,
        quantity_returned: data.quantity,
        condition: data.condition,
        return_to_purchase_item_id: originalItem.purchase_item_id || null,
      });
    });

    if (!isValid) return;
    if (itemsToReturn.length === 0) {
      toast.warning(t("sales:returnsPage.selectAtLeastOneItem"));
      return;
    }

    const payload: CreateSaleReturnData = {
      original_sale_id: saleDetails.id,
      return_date: new Date().toISOString().split("T")[0],
      return_reason: returnReason || t("sales:returnsPage.noReasonSpecified"),
      notes: notes,
      status: "completed",
      credit_action: creditAction,
      refunded_amount: calculateTotalRefund(),
      items: itemsToReturn,
    };

    createReturnMutation.mutate(payload);
  };

  const handleReset = () => {
    setSelectedSale(null);
    setSelectedItems({});
    setReturnReason("");
    setNotes("");
    setCreditAction("refund");
    setInvoiceNumber("");
    setSearchQuery("");
  };

  const totalRefund = calculateTotalRefund();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/sales/returns")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Undo2 className="h-6 w-6 text-blue-600" />
              {t("sales:returnsListPage.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t("sales:returnsPage.createNewReturnRequest")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/sales/returns")}
          className="gap-2"
        >
          <History className="h-4 w-4" />
          {t("sales:returnsPage.returnsHistory")}
        </Button>
      </div>

      {/* Step 1: Search Sale */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                currentStep >= 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              )}
            >
              1
            </div>
            <CardTitle>{t("sales:returnsPage.searchInvoiceTitle")}</CardTitle>
          </div>
          <CardDescription>
            {t("sales:returnsPage.searchInvoiceDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Loading state when fetching sale from query parameter */}
          {isLoadingSaleFromParam && (
            <div className="mb-4 space-y-2">
              <Skeleton className="h-10 w-full" />
              <p className="text-sm text-muted-foreground text-center">
                {t("sales:returnsPage.loadingInvoiceEllipsis")}
              </p>
            </div>
          )}

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="invoice-search" className="sr-only">
                {t("sales:invoice")}
              </Label>
              <Input
                id="invoice-search"
                placeholder={t("sales:returnsPage.invoiceExamplePlaceholder")}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                disabled={isSearching || !!saleDetails || isLoadingSaleFromParam}
                className="text-lg"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching || !invoiceNumber.trim() || !!saleDetails || isLoadingSaleFromParam}
              className="gap-2"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {t("sales:returnsPage.searchButton")}
            </Button>
          </form>

          {/* Search Results */}
          {isSearching && (
            <div className="mt-4 space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {searchResults && searchResults.length > 0 && !saleDetails && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("sales:returnsPage.foundResultsCount", { count: searchResults.length })}
              </p>
              {searchResults.map((sale) => (
                <Card
                  key={sale.id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => handleSelectSale(sale)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {sale.invoice_number || `#${sale.id}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {sale.client?.name || t("sales:returnsPage.cashClient")} • {sale.sale_date}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {formatCurrency(Number(sale.total_amount))}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searchResults && searchResults.length === 0 && !isSearching && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("sales:returnsPage.invoiceNotFoundByNumber")}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Sale Details */}
      {saleDetails && (
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  currentStep >= 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                )}
              >
                2
              </div>
              <CardTitle>{t("sales:returnsPage.invoiceDetailsTitle")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingDetails ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : saleError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("sales:returnsPage.loadInvoiceDetailsFailed")}
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    {t("sales:client")}
                  </div>
                  <p className="font-semibold">
                    {saleDetails.client?.name || t("sales:returnsPage.cashClient")}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {t("sales:saleDate")}
                  </div>
                  <p className="font-semibold">{saleDetails.sale_date}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    {t("sales:detailsPage.total")}
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(Number(saleDetails.total_amount))}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {t("sales:invoice")}
                  </div>
                  <p className="font-semibold">
                    {saleDetails.invoice_number || `#${saleDetails.id}`}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Select Items */}
      {saleDetails && (
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  currentStep >= 3
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                )}
              >
                3
              </div>
              <CardTitle>{t("sales:returnsPage.selectItemsToReturnTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("sales:returnsPage.selectItemsDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t("sales:returnsPage.selectItemsAlert")}
              </AlertDescription>
            </Alert>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <span className="sr-only">{t("sales:returnsPage.selectColumn")}</span>
                    </TableHead>
                    <TableHead>{t("sales:returnsPage.itemColumn")}</TableHead>
                    <TableHead className="text-center">{t("sales:returnsPage.soldQuantity")}</TableHead>
                    <TableHead className="text-center">{t("sales:unitPrice")}</TableHead>
                    <TableHead className="text-center w-32">
                      {t("sales:returnsPage.returnedQuantity")}
                    </TableHead>
                    <TableHead className="text-center w-40">{t("sales:returnsPage.conditionColumn")}</TableHead>
                    <TableHead className="text-right">{t("sales:returnsPage.returnValueColumn")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleDetails.items?.map((item) => {
                    if (!item.id) return null;
                    const isSelected = !!selectedItems[item.id];
                    const selection = selectedItems[item.id] || {
                      quantity: 1,
                      condition: "resellable" as const,
                      maxReturnable: item.quantity,
                    };

                    return (
                      <TableRow
                        key={item.id}
                        className={cn(
                          isSelected && "bg-blue-50 dark:bg-blue-950/20"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleItemToggle(item)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.product?.name || item.product_name}
                            </p>
                            {item.product?.sku && (
                              <p className="text-xs text-muted-foreground">
                                {item.product.sku}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatNumber(item.quantity)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatCurrency(Number(item.unit_price))}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            max={selection.maxReturnable}
                            value={isSelected ? selection.quantity : ""}
                            onChange={(e) =>
                              handleItemChange(
                                item.id!,
                                "quantity",
                                e.target.value
                              )
                            }
                            disabled={!isSelected}
                            className="text-center w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={isSelected ? selection.condition : ""}
                            onValueChange={(value) =>
                              handleItemChange(
                                item.id!,
                                "condition",
                                value
                              )
                            }
                            disabled={!isSelected}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t("sales:returnsPage.selectConditionPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="resellable">
                                {t("sales:returnsPage.resellableFull")}
                              </SelectItem>
                              <SelectItem value="damaged">{t("sales:condition_damaged")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {isSelected
                            ? formatCurrency(
                                selection.quantity * Number(item.unit_price)
                              )
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review and Submit */}
      {saleDetails && Object.keys(selectedItems).length > 0 && (
        <Card className="dark:bg-gray-900 dark:border-gray-700">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold",
                  currentStep >= 4
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                )}
              >
                4
              </div>
              <CardTitle>{t("sales:returnsPage.returnSummaryTitle")}</CardTitle>
            </div>
            <CardDescription>
              {t("sales:returnsPage.reviewAndCompleteDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("sales:totalReturnedValue")}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(totalRefund)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("sales:returnsPage.itemsCount")}
                </p>
                <p className="text-2xl font-bold">
                  {Object.keys(selectedItems).length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {t("sales:returnsPage.returnMethodLabel")}
                </p>
                <Select
                  value={creditAction}
                  onValueChange={(value) =>
                    setCreditAction(value as "refund" | "store_credit")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="refund">{t("sales:returnsPage.cashRefund")}</SelectItem>
                    <SelectItem value="store_credit">{t("sales:returnsPage.clientCredit")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="return-reason">{t("sales:returnReasonLabel")}</Label>
                <Input
                  id="return-reason"
                  placeholder={t("sales:returnsPage.reasonExamplePlaceholder")}
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="return-notes">{t("sales:returnsPage.additionalNotes")}</Label>
                <Textarea
                  id="return-notes"
                  placeholder={t("sales:returnsPage.anyAdditionalNotesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={createReturnMutation.isPending}
              >
                {t("common:cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createReturnMutation.isPending || totalRefund <= 0
                }
                className="gap-2"
              >
                {createReturnMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                {t("sales:returnsPage.confirmReturnButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalesReturnsPage;
