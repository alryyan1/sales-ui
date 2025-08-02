// src/pages/sales/SaleReturnsListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  Undo2,
  Trash2,
  Calendar,
  Package,
  CheckSquare,
  Square,
  Search,
  Filter,
  X,
} from "lucide-react";

// Services and Types
import saleService, { Sale, SaleItem } from "../../services/saleService";
import productService from "../../services/productService";
import clientService from "../../services/clientService";
import { formatCurrency, formatDate } from "@/constants";
import { apiClient } from "@/lib/axios";

// Types for filters
interface Product {
  id: number;
  name: string;
  sku: string;
}

interface Client {
  id: number;
  name: string;
  phone?: string;
}

// --- Component ---
const SaleReturnsListPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common"]);
  
  // --- State ---
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Today's date as default
  );
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalReturnedAmount, setTotalReturnedAmount] = useState(0);
  
  // Filter states
  const [searchSaleId, setSearchSaleId] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [showOnlyReturns, setShowOnlyReturns] = useState(false);
  
  // Data for filters
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  
  // Dialog state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [returnedItems, setReturnedItems] = useState<{[key: number]: number}>({});
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);
  
  // Mass deletion state
  const [selectedSales, setSelectedSales] = useState<Set<number>>(new Set());
  const [isDeletingSales, setIsDeletingSales] = useState(false);

  // --- Load Filter Data ---
  const loadProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const response = await productService.getProducts(1, '', 1000);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  const loadClients = useCallback(async () => {
    setIsLoadingClients(true);
    try {
      const response = await clientService.getClients(1, '', 1000);
      setClients(response.data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoadingClients(false);
    }
  }, []);

  // --- Fetch Sales Data ---
  const fetchSalesForDate = useCallback(async (date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Fetching sales for date:', date);
      
      // First, let's try to get all sales to see if the API is working
      console.log('Trying to get all sales first...');
      const allSalesResponse = await saleService.getSales(
        1, // page
        '', // search
        '', // status
        '', // startDate
        '', // endDate
        1000, // limit
        null, // clientId
        false, // todayOnly
        null // forCurrentUser
      );
      console.log('All sales response:', allSalesResponse);
      console.log('All sales count:', allSalesResponse.data?.length || 0);
      
      // Now try with date filtering
      const response = await saleService.getSales(
        1, // page
        '', // search
        '', // status - get all statuses for now
        date, // startDate
        date, // endDate
        1000, // limit - get all sales for the day
        null, // clientId
        false, // todayOnly
        null // forCurrentUser
      );
      
      console.log('Sales API response:', response);
      console.log('Sales data:', response.data);
      console.log('Sales count:', response.data?.length || 0);
      
      // If no sales found with date filtering, try with todayOnly for today's date
      if ((response.data?.length || 0) === 0 && date === new Date().toISOString().split('T')[0]) {
        console.log('No sales found with date filtering, trying todayOnly...');
        const todayResponse = await saleService.getSales(
          1, // page
          '', // search
          '', // status
          '', // startDate
          '', // endDate
          1000, // limit
          null, // clientId
          true, // todayOnly
          null // forCurrentUser
        );
        console.log('TodayOnly response:', todayResponse);
        console.log('TodayOnly sales count:', todayResponse.data?.length || 0);
        setSales(todayResponse.data || []);
      } else {
        setSales(response.data || []);
      }
      
      // If still no sales, try client-side filtering as last resort
      if ((response.data?.length || 0) === 0 && allSalesResponse.data?.length > 0) {
        console.log('Trying client-side date filtering...');
        const filteredSales = allSalesResponse.data.filter(sale => {
          const saleDate = sale.sale_date || sale.created_at?.split('T')[0];
          console.log('Sale date:', saleDate, 'Looking for:', date);
          return saleDate === date;
        });
        console.log('Client-side filtered sales:', filteredSales);
        setSales(filteredSales);
      }
      
      // Fetch total returned amount for the selected date
      try {
        const totalAmountResponse = await apiClient.get(`/sale-returns/total-amount?date=${date}`);
        setTotalReturnedAmount(totalAmountResponse.data.total_returned_amount || 0);
      } catch (error) {
        console.error('Error fetching total returned amount:', error);
        setTotalReturnedAmount(0);
      }
    } catch (err) {
      console.error('Error fetching sales:', err);
      const errorMsg = saleService.getErrorMessage ? saleService.getErrorMessage(err) : 'Failed to fetch sales';
      setError(errorMsg);
      toast.error(t("common:error"), { description: errorMsg });
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // --- Apply Filters ---
  const applyFilters = useCallback(() => {
    let filtered = [...sales];

    // Filter by sale ID
    if (searchSaleId.trim()) {
      filtered = filtered.filter(sale => 
        sale.id.toString().includes(searchSaleId.trim()) ||
        (sale.invoice_number && sale.invoice_number.toLowerCase().includes(searchSaleId.toLowerCase()))
      );
    }

    // Filter by client
    if (searchClient.trim()) {
      filtered = filtered.filter(sale => 
        sale.client_name && sale.client_name.toLowerCase().includes(searchClient.toLowerCase())
      );
    }

    // Filter by product
    if (selectedProduct) {
      filtered = filtered.filter(sale => 
        sale.items?.some(item => item.product_id === selectedProduct)
      );
    }

    // Filter by returns only
    if (showOnlyReturns) {
      filtered = filtered.filter(sale => sale.has_returns);
    }

    setFilteredSales(filtered);
  }, [sales, searchSaleId, searchClient, selectedProduct, showOnlyReturns]);

  // --- Effects ---
  useEffect(() => {
    fetchSalesForDate(selectedDate);
    loadProducts();
    loadClients();
  }, [selectedDate, fetchSalesForDate, loadProducts, loadClients]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // --- Handle Date Change ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  // --- Clear Filters ---
  const clearFilters = () => {
    setSearchSaleId("");
    setSearchClient("");
    setSelectedProduct(null);
    setShowOnlyReturns(false);
  };

  // --- Handle Sale Items Dialog ---
  const handleOpenSaleItems = async (sale: Sale) => {
    console.log('Opening sale items for sale:', sale);
    console.log('Sale items:', sale.items);
    
    try {
      // Fetch the full sale with items
      const fullSale = await saleService.getSale(sale.id);
      console.log('Full sale with items:', fullSale);
      console.log('Full sale items:', fullSale.items);
      
      setSelectedSale(fullSale);
      setReturnedItems({});
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      // Fallback to the sale from the list
      setSelectedSale(sale);
      setReturnedItems({});
      setIsDialogOpen(true);
    }
  };

  // --- Handle Return Item Quantity Change ---
  const handleReturnQuantityChange = (itemId: number, quantity: number) => {
    setReturnedItems(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  // --- Process Return ---
  const handleProcessReturn = async () => {
    if (!selectedSale) return;
    
    const itemsToReturn = Object.entries(returnedItems)
      .filter(([_, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({
        original_sale_item_id: parseInt(itemId),
        product_id: selectedSale.items?.find(item => item.id === parseInt(itemId))?.product_id || 0,
        quantity_returned: quantity,
        condition: 'resellable' // Default condition
      }));
    
    if (itemsToReturn.length === 0) {
      toast.error(t("sales:noItemsSelectedForReturn"));
      return;
    }
    
    setIsProcessingReturn(true);
    try {
      // Call the backend API to process return using apiClient
      const response = await apiClient.post('/sale-returns', {
        original_sale_id: selectedSale.id,
        return_date: new Date().toISOString().split('T')[0],
        return_reason: 'Customer return',
        notes: 'Return processed from POS',
        status: 'completed',
        credit_action: 'refund',
        refunded_amount: itemsToReturn.reduce((total, item) => {
          const saleItem = selectedSale.items?.find(si => si.id === item.original_sale_item_id);
          return total + (item.quantity_returned * Number(saleItem?.unit_price || 0));
        }, 0),
        items: itemsToReturn
      });

      console.log('Return processed successfully:', response.data);
      
      toast.success(t("sales:returnProcessedSuccessfully"));
      setIsDialogOpen(false);
      
      // Refresh sales data and total returned amount
      await fetchSalesForDate(selectedDate);
    } catch (error) {
      console.error('Error processing return:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to process return';
      toast.error(t("common:error"), { description: errorMsg });
    } finally {
      setIsProcessingReturn(false);
    }
  };

  // --- Handle Delete Sale ---
  const handleDeleteSale = async (sale: Sale) => {
    if (!confirm(t("sales:confirmDeleteSale"))) return;
    
    try {
      // Call the backend API to delete sale using apiClient
      await apiClient.delete(`/sales/${sale.id}`);

      console.log('Sale deleted successfully');
      toast.success(t("sales:saleDeletedSuccessfully"));
      
      // Refresh sales data
      await fetchSalesForDate(selectedDate);
    } catch (error) {
      console.error('Error deleting sale:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete sale';
      toast.error(t("common:error"), { description: errorMsg });
    }
  };

  // --- Mass Deletion Functions ---
  const handleSelectAll = () => {
    if (selectedSales.size === filteredSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(filteredSales.map(sale => sale.id)));
    }
  };

  const handleSelectSale = (saleId: number) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
  };

  const handleDeleteSelectedSales = async () => {
    if (selectedSales.size === 0) {
      toast.error(t("sales:noSalesSelectedForDeletion"));
      return;
    }

    if (!confirm(t("sales:confirmDeleteSelectedSales", { count: selectedSales.size }))) return;
    
    setIsDeletingSales(true);
    try {
      const deletePromises = Array.from(selectedSales).map(saleId => 
        apiClient.delete(`/sales/${saleId}`)
      );

      const results = await Promise.allSettled(deletePromises);
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        toast.success(t("sales:selectedSalesDeletedSuccessfully", { count: successful }));
      }
      if (failed > 0) {
        toast.error(t("sales:someSalesFailedToDelete", { count: failed }));
      }

      setSelectedSales(new Set());
      await fetchSalesForDate(selectedDate);
    } catch (error) {
      console.error('Error deleting selected sales:', error);
      toast.error(t("common:error"), { description: 'Failed to delete selected sales' });
    } finally {
      setIsDeletingSales(false);
    }
  };

  // --- Helper Functions ---
  const getSaleItemsNames = (items: SaleItem[]) => {
    return items.map(item => item.product_name || 'Unknown Product').join(', ');
  };

  const formatDateTime = (dateString: string, timeString?: string) => {
    const date = parseISO(dateString);
    const time = timeString ? parseISO(timeString) : date;
    return format(date, 'yyyy-MM-dd') + ' ' + format(time, 'HH:mm:ss');
  };

  const activeFiltersCount = [
    searchSaleId ? 1 : 0,
    searchClient ? 1 : 0,
    selectedProduct ? 1 : 0,
    showOnlyReturns ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Main Content - Sales Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {t("sales:returnsListTitle")}
            </h1>
            <div className="flex items-center gap-2">
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  {activeFiltersCount} {t("common:activeFilters")}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Total Returned Amount Summary */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Undo2 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-gray-800 dark:text-gray-100">
                {t("sales:totalReturnedToday")}:
              </span>
            </div>
            <span className="text-xl font-bold text-green-600">
              {formatCurrency(totalReturnedAmount)}
            </span>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex-1 overflow-auto">
          {isLoading && (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}
          
          {!isLoading && error && (
            <Alert variant="destructive" className="m-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isLoading && !error && (
            <div className="p-4">
              <Card className="dark:bg-gray-900">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {t("sales:salesForDate")}: {formatDate(selectedDate)} 
                      <span className="text-sm font-normal text-gray-500 ml-2">
                        ({filteredSales.length} {t("common:results")})
                      </span>
                    </CardTitle>
                    {filteredSales.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="flex items-center gap-2"
                        >
                          {selectedSales.size === filteredSales.length ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          {selectedSales.size === filteredSales.length ? t("common:deselectAll") : t("common:selectAll")}
                        </Button>
                        {selectedSales.size > 0 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDeleteSelectedSales}
                            disabled={isDeletingSales}
                            className="flex items-center gap-2"
                          >
                            {isDeletingSales ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            {t("common:deleteSelected")} ({selectedSales.size})
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedSales.size === filteredSales.length && filteredSales.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>{t("sales:saleId")}</TableHead>
                        <TableHead>{t("sales:dateAndTime")}</TableHead>
                        <TableHead className="text-right">{t("sales:totalAmount")}</TableHead>
                        <TableHead className="text-right">{t("sales:amountPaid")}</TableHead>
                        <TableHead>{t("sales:saleItems")}</TableHead>
                        <TableHead className="text-center">{t("sales:hasReturns")}</TableHead>
                        <TableHead className="text-center">{t("common:actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSales.length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={8}
                            className="h-24 text-center text-muted-foreground"
                          >
                            {sales.length === 0 
                              ? t("sales:noSalesFoundForDate")
                              : t("common:noResultsFound")
                            }
                          </TableCell>
                        </TableRow>
                      )}
                      {filteredSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedSales.has(sale.id)}
                              onCheckedChange={() => handleSelectSale(sale.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {sale.invoice_number || `SALE-${sale.id}`}
                          </TableCell>
                          <TableCell>
                            {formatDateTime(sale.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(sale.total_amount))}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(Number(sale.paid_amount))}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {getSaleItemsNames(sale.items || [])}
                          </TableCell>
                          <TableCell className="text-center">
                            {sale.has_returns ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                <Undo2 className="h-3 w-3 mr-1" />
                                {t("sales:hasReturns")}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenSaleItems(sale)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    {t("sales:viewItems")}
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>
                                      {t("sales:saleItems")} - {sale.invoice_number || `SALE-${sale.id}`}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="text-sm text-gray-500 mb-2">
                                      Debug: Selected Sale ID: {selectedSale?.id}, Items Count: {selectedSale?.items?.length || 0}
                                    </div>
                                    <div className="grid gap-4">
                                      {selectedSale?.items && selectedSale.items.length > 0 ? (
                                        selectedSale.items.map((item) => (
                                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex-1">
                                              <div className="font-medium">{item.product_name}</div>
                                              <div className="text-sm text-gray-500">
                                                {t("sales:quantity")}: {item.quantity} | {t("sales:unitPrice")}: {formatCurrency(Number(item.unit_price))}
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Label htmlFor={`return-${item.id}`} className="text-sm">
                                                {t("sales:returnQuantity")}:
                                              </Label>
                                              <Select
                                                value={returnedItems[item.id || 0]?.toString() || "0"}
                                                onValueChange={(value) => handleReturnQuantityChange(item.id || 0, parseInt(value))}
                                              >
                                                <SelectTrigger className="w-20">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  {Array.from({ length: item.quantity + 1 }, (_, i) => (
                                                    <SelectItem key={i} value={i.toString()}>
                                                      {i}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <div className="text-center py-4 text-gray-500">
                                          {t("sales:noItemsInReturn")}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex justify-end gap-2 pt-4 border-t">
                                      <Button
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        disabled={isProcessingReturn}
                                      >
                                        {t("common:cancel")}
                                      </Button>
                                      <Button
                                        onClick={handleProcessReturn}
                                        disabled={isProcessingReturn}
                                      >
                                        {isProcessingReturn ? (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                          <Undo2 className="h-4 w-4 mr-2" />
                                        )}
                                        {t("sales:processReturn")}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                              
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteSale(sale)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t("common:delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Filters Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {t("common:filters")}
            </h2>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4 mr-1" />
                {t("common:clear")}
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Date Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {t("sales:selectDate")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Search Sale ID */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t("sales:searchBySaleId")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Input
                  placeholder={t("sales:saleIdPlaceholder")}
                  value={searchSaleId}
                  onChange={(e) => setSearchSaleId(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Search Client */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  {t("sales:searchByClient")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Input
                  placeholder={t("sales:clientPlaceholder")}
                  value={searchClient}
                  onChange={(e) => setSearchClient(e.target.value)}
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* Filter by Product */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t("sales:filterByProduct")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Select
                  value={selectedProduct?.toString() || ""}
                  onValueChange={(value) => setSelectedProduct(value ? parseInt(value) : null)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("sales:selectProductPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t("common:allProducts")}</SelectItem>
                    {isLoadingProducts ? (
                      <SelectItem value="" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t("common:loading")}...
                      </SelectItem>
                    ) : (
                      products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Show Only Returns */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Undo2 className="h-4 w-4" />
                  {t("sales:showOnlyReturns")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="showOnlyReturns"
                    checked={showOnlyReturns}
                    onCheckedChange={(checked) => setShowOnlyReturns(checked as boolean)}
                  />
                  <Label htmlFor="showOnlyReturns" className="text-sm">
                    {t("sales:showOnlySalesWithReturns")}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Debug Information */}
            {process.env.NODE_ENV === 'development' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-500">Debug Info</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Selected Date: {selectedDate}</div>
                    <div>Total Sales: {sales.length}</div>
                    <div>Filtered Sales: {filteredSales.length}</div>
                    <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                    <div>Error: {error || 'None'}</div>
                    <div>Selected Sales: {selectedSales.size}</div>
                    <div>Active Filters: {activeFiltersCount}</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleReturnsListPage;
