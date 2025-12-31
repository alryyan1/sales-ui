import React, { useEffect, useState, useCallback } from "react";
// import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CreateStockTransferDialog } from "@/components/inventory/CreateStockTransferDialog";
import stockTransferService, {
  StockTransfer,
} from "@/services/stockTransferService";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function StockTransfersPage() {
  // const { t } = useTranslation(["inventory", "common"]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters] = useState<{ product_id?: number }>({});

  const loadTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await stockTransferService.getAll(page, 15, filters);
      setTransfers(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (error) {
      console.error("Error loading stock transfers:", error);
      toast.error("فشل تحميل التحويلات");
      setTransfers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    loadTransfers();
  }, [loadTransfers]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">تحويلات المخزون</h1>
          <p className="text-muted-foreground">
            إدارة حركة المخزون بين المستودعات.
          </p>
        </div>
        <CreateStockTransferDialog
          onSuccess={() => {
            setPage(1);
            loadTransfers();
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجل التحويلات</CardTitle>
          <CardDescription>جميع حركات المخزون المسجلة.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>من</TableHead>
                      <TableHead>إلى</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead>المستخدم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transfers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center h-24 text-muted-foreground"
                        >
                          لا توجد تحويلات.
                        </TableCell>
                      </TableRow>
                    ) : (
                      transfers.map((transfer) => (
                        <TableRow key={transfer.id}>
                          <TableCell>
                            {transfer.transfer_date
                              ? format(
                                  new Date(transfer.transfer_date),
                                  "yyyy-MM-dd"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="font-medium">
                            {transfer.product?.name}
                            <div className="text-xs text-muted-foreground">
                              {transfer.product?.sku}
                            </div>
                          </TableCell>
                          <TableCell>{transfer.from_warehouse?.name}</TableCell>
                          <TableCell>{transfer.to_warehouse?.name}</TableCell>
                          <TableCell className="text-right font-bold">
                            {typeof transfer.quantity === "number"
                              ? transfer.quantity.toLocaleString()
                              : transfer.quantity}
                          </TableCell>
                          <TableCell>{transfer.user?.name || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page > 1) setPage(page - 1);
                          }}
                          isActive={page === 1}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (p) => (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={page === p}
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(p);
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (page < totalPages) setPage(page + 1);
                          }}
                          isActive={page === totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
