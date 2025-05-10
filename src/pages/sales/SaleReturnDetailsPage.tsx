// src/pages/sales/SaleReturnDetailsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link as RouterLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator"; // Optional
import { Badge } from "@/components/ui/badge"; // For status
import { Loader2, AlertCircle, ArrowLeft, FileText, Info } from "lucide-react";

// Services and Types
import saleReturnService, {
  SaleReturn,
} from "../../services/saleReturnService"; // Adjust path
import { formatCurrency, formatDate, formatNumber } from "@/constants"; // Helpers
import { FormLabel, Typography } from "@mui/material";
import { cn } from "@/lib/utils";

// --- Component ---
const SaleReturnDetailsPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common", "products", "clients"]);
  const navigate = useNavigate();
  const { returnId } = useParams<{ returnId: string }>(); // Get the returnId from URL

  // --- State ---
  const [saleReturn, setSaleReturn] = useState<SaleReturn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch Sale Return Details ---
  useEffect(() => {
    const fetchDetails = async (id: number) => {
      setIsLoading(true);
      setError(null);
      console.log(`Fetching details for Sale Return ID: ${id}`);
      try {
        const data = await saleReturnService.getSaleReturn(id);
        console.log(data,'data')
        setSaleReturn(data);
      } catch (err) {
        const errorMsg = saleReturnService.getErrorMessage(err);
        setError(errorMsg);
        toast.error(t("common:error"), { description: errorMsg });
      } finally {
        setIsLoading(false);
      }
    };

    const numericId = Number(returnId);
    if (returnId && !isNaN(numericId) && numericId > 0) {
      fetchDetails(numericId);
    } else {
      setError(t("sales:invalidReturnId") || "Invalid Sale Return ID."); // Add key
      setIsLoading(false);
    }
  }, [returnId, t]); // Dependency: returnId from URL

  // --- Render Logic ---
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-150px)] dark:bg-gray-950">
        
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 dark:bg-gray-950 min-h-screen">
        
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={() => navigate("/sales/returns")}>
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("sales:backToReturnsList")}
          </Button>
        </div>
      </div>
    ); // Add key
  }

  if (!saleReturn) {
    return (
      <div className="p-6 dark:bg-gray-950 min-h-screen text-center">
        <p className="text-muted-foreground">{t("sales:returnNotFound")}</p>
        <Button
          variant="outline"
          onClick={() => navigate("/sales/returns")}
          className="mt-4"
        >
          <ArrowLeft className="me-2 h-4 w-4" />
          {t("sales:backToReturnsList")}
        </Button>
      </div>
    ); // Add key
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500 hover:bg-green-600";
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "cancelled":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };
  const getCreditActionColor = (action: string) => {
    switch (action) {
      case "refund":
        return "bg-blue-500 hover:bg-blue-600";
      case "store_credit":
        return "bg-purple-500 hover:bg-purple-600";
      case "none":
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/sales/returns")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {t("sales:returnDetailsTitle")} #{saleReturn.id} {/* Add key */}
        </h1>
        {/* Optional Print Button */}
      </div>

      {/* Main Details Card */}
      <Card className="dark:bg-gray-900 mb-6 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-xl">
            {t("sales:returnInformation")}
          </CardTitle>
          {/* Add key */}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("sales:returnIdCap")}
              </FormLabel>
              <p className="font-medium">RTN-{saleReturn.id}</p>
            </div>
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("sales:originalSaleInvoiceShort")}
              </FormLabel>
              <p className="font-medium">
                {saleReturn.originalSale?.invoice_number ||
                  `(#${saleReturn.original_sale_id})`}
              </p>
            </div>
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("clients:client")}
              </FormLabel>
              <p className="font-medium">
                {saleReturn.client?.name || t("common:n/a")}
              </p>
            </div>
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("sales:returnDate")}
              </FormLabel>
              <p className="font-medium">
                {formatDate(saleReturn.return_date)}
              </p>
            </div>
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("sales:returnStatusLabel")}
              </FormLabel>
              <p>
                <Badge
                  className={cn(
                    getStatusColor(saleReturn.status),
                    "text-white"
                  )}
                >
                  {t(`sales:status_return_${saleReturn.status}`)}
                </Badge>
              </p>
            </div>
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("sales:creditActionLabel")}
              </FormLabel>
              <p>
                <Badge
                  className={cn(
                    getCreditActionColor(saleReturn.credit_action),
                    "text-white"
                  )}
                >
                  {t(`sales:creditAction_${saleReturn.credit_action}`)}
                </Badge>
              </p>
            </div>
            {saleReturn.credit_action === "refund" && (
              <div>
                <FormLabel className="text-xs text-muted-foreground">
                  {t("sales:refundedAmountLabel")}
                </FormLabel>
                <p className="font-medium">
                  {formatCurrency(saleReturn.refunded_amount)}
                </p>
              </div>
            )}
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("common:recordedBy")}
              </FormLabel>
              <p className="font-medium">
                {saleReturn.user?.name || t("common:n/a")}
              </p>
            </div>
            <div>
              <FormLabel className="text-xs text-muted-foreground">
                {t("common:recordedDate")}
              </FormLabel>
              <p className="font-medium">{formatDate(saleReturn.created_at)}</p>
            </div>
            {saleReturn.return_reason && (
              <div className="md:col-span-2 lg:col-span-3">
                <FormLabel className="text-xs text-muted-foreground">
                  {t("sales:returnReasonLabel")}
                </FormLabel>
                <p className="text-sm">{saleReturn.return_reason}</p>
              </div>
            )}
            {saleReturn.notes && (
              <div className="md:col-span-2 lg:col-span-3">
                <FormLabel className="text-xs text-muted-foreground">
                  {t("sales:notesLabel")}
                </FormLabel>
                <p className="text-sm whitespace-pre-wrap">
                  {saleReturn.notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Returned Items Table */}
      <Card className="dark:bg-gray-900 dark:border-gray-700">
        <CardHeader>
          <CardTitle>{t("sales:returnedItemsTitle")}</CardTitle>
        </CardHeader>
        {/* Add key */}
        <CardContent className="p-0">
          
          {/* Remove padding if table has its own */}
          <Table>
            <TableHeader>
              <TableRow className="dark:border-gray-700">
                <TableHead className="dark:text-gray-300">
                  {t("products:product")}
                </TableHead>
                <TableHead className="dark:text-gray-300">
                  {t("products:sku")}
                </TableHead>
                <TableHead className="dark:text-gray-300">
                  {t("purchases:batchNumber")}
                </TableHead>
                <TableHead className="dark:text-gray-300 text-center">
                  {t("sales:quantityReturned")}
                </TableHead>
                {/* Add key */}
                <TableHead className="dark:text-gray-300">
                  {t("sales:itemCondition")}
                </TableHead>
                <TableHead className="dark:text-gray-300 text-right">
                  {t("sales:originalPricePerUnit")}
                </TableHead>
                {/* Add key */}
                <TableHead className="dark:text-gray-300 text-right">
                  {t("sales:totalReturnedValueForItem")}
                </TableHead>
                {/* Add key */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {saleReturn.items && saleReturn.items.length > 0 ? (
                saleReturn.items.map((item) => (
                  <TableRow key={item.id} className="dark:border-gray-700">
                    <TableCell className="font-medium dark:text-gray-100">
                      {item.product?.name || `ID: ${item.product_id}`}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {item.product?.sku || "---"}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {item.batch_number_sold ||
                        item.purchaseItemBatch?.batch_number ||
                        "---"}
                    </TableCell>
                    <TableCell className="text-center dark:text-gray-100">
                      {formatNumber(item.quantity_returned)}
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      {item.condition
                        ? t(`sales:condition_${item.condition}`)
                        : "---"}
                    </TableCell>
                    <TableCell className="text-right dark:text-gray-100">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right dark:text-gray-100">
                      {formatCurrency(item.total_returned_value)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {t("sales:noItemsInReturn")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grand Total Returned Value */}
      <div className="flex justify-end mt-6">
        <Card className="w-full max-w-sm dark:bg-gray-900 dark:border-gray-700">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Typography
                variant="h6"
                component="p"
                className="font-semibold text-gray-800 dark:text-gray-100"
              >
                {t("sales:totalReturnedValue")}:
              </Typography>
              <Typography
                variant="h6"
                component="p"
                className="font-bold text-gray-800 dark:text-gray-100"
              >
                {formatCurrency(saleReturn.total_returned_amount)}
              </Typography>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SaleReturnDetailsPage;
