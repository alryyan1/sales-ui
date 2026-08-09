import React, { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStockTransferDialog } from "@/components/inventory/CreateStockTransferDialog";
import stockTransferService, { StockTransfer } from "@/services/stockTransferService";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { ProductImage } from "@/components/products/ProductImage";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useTranslation } from "react-i18next";

export default function StockTransfersPage() {
  const { t } = useTranslation(["inventory"]);
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
      toast.error(t("inventory:stockTransfersPage.loadFailed"));
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
    <div className="container mx-auto py-4 px-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t("inventory:stockTransfersPage.title")}</h1>
            <p className="text-xs text-muted-foreground">{t("inventory:stockTransfersPage.subtitle")}</p>
          </div>
        </div>
        <CreateStockTransferDialog onSuccess={() => { setPage(1); loadTransfers(); }} />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="text-center text-xs font-semibold py-2 w-28">{t("inventory:stockTransfersPage.colDate")}</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">{t("inventory:stockTransfersPage.colFromWarehouse")}</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">{t("inventory:stockTransfersPage.colToWarehouse")}</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">{t("inventory:stockTransfersPage.colProducts")}</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">{t("inventory:stockTransfersPage.colUser")}</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">{t("inventory:stockTransfersPage.colNotes")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-32 text-sm text-muted-foreground">
                        {t("inventory:stockTransfersPage.noTransfers")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transfers.map((transfer) => (
                      <TableRow key={transfer.id} className="hover:bg-muted/30 align-top">
                        <TableCell className="text-center py-2 text-xs text-muted-foreground tabular-nums">
                          {transfer.transfer_date
                            ? format(new Date(transfer.transfer_date), "yyyy-MM-dd")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {transfer.from_warehouse?.name ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            {transfer.to_warehouse?.name ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center py-2">
                          <div className="flex flex-col gap-1 items-center">
                            {transfer.items?.length ? (
                              transfer.items.map((item) => (
                                <div key={item.id} className="flex items-center gap-1.5 text-xs">
                                  <ProductImage
                                    imageUrl={item.product?.image_url}
                                    productName={item.product?.name}
                                    size={28}
                                  />
                                  <span className="font-medium">{item.product?.name ?? `#${item.product_id}`}</span>
                                  <Badge className="tabular-nums text-xs px-1.5 py-0">
                                    {typeof item.quantity === "number"
                                      ? item.quantity.toLocaleString()
                                      : item.quantity}
                                  </Badge>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-2 text-xs text-muted-foreground">
                          {transfer.user?.name || "-"}
                        </TableCell>
                        <TableCell className="text-center py-2 text-xs text-muted-foreground max-w-[150px] truncate">
                          {transfer.notes || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="border-t px-4 py-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => { e.preventDefault(); if (page > 1) setPage(page - 1); }}
                          isActive={page === 1}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <PaginationItem key={p}>
                          <PaginationLink
                            href="#"
                            isActive={page === p}
                            onClick={(e) => { e.preventDefault(); setPage(p); }}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => { e.preventDefault(); if (page < totalPages) setPage(page + 1); }}
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
