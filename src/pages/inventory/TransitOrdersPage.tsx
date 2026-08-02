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
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateTransitOrderDialog } from "@/components/inventory/CreateTransitOrderDialog";
import transitOrderService, {
  TransitOrder,
  TransitOrderItem,
} from "@/services/transitOrderService";
import { Loader2, Truck, PackageCheck } from "lucide-react";
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

interface OrderItemRow {
  order: TransitOrder;
  item: TransitOrderItem | null;
}

export default function TransitOrdersPage() {
  const [orders, setOrders] = useState<TransitOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await transitOrderService.getAll(page, 15);
      setOrders(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (error) {
      toast.error("فشل تحميل الطلبات");
      setOrders([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const rows: OrderItemRow[] = orders.flatMap((order) =>
    order.items?.length
      ? order.items.map((item) => ({ order, item }))
      : [{ order, item: null }]
  );

  return (
    <div className="container mx-auto py-4 px-4 space-y-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Transit Orders</h1>
            <p className="text-xs text-muted-foreground">إدارة الشحنات الواردة قيد النقل من الموردين</p>
          </div>
        </div>
        <CreateTransitOrderDialog onSuccess={() => { setPage(1); loadOrders(); }} />
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
                    <TableHead className="text-center text-xs font-semibold py-2 w-20">رقم الطلب</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2 w-28">تاريخ الطلب</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2 w-28">تاريخ الوصول المتوقع</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">المستودع الوجهة</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">المورد</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">الصنف</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">المخزون الحالي</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">الكمية</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">المجموع</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">الحالة</TableHead>
                    <TableHead className="text-center text-xs font-semibold py-2">استلام</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center h-32 text-sm text-muted-foreground">
                        لا توجد طلبات مسجلة.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(({ order, item }) => {
                      const currentStock = Number(item?.current_stock_at_warehouse ?? 0);
                      const quantity = Number(item?.quantity ?? 0);
                      const total = currentStock + quantity;
                      const isReceived = item?.is_received ?? false;

                      return (
                        <TableRow
                          key={item ? `item-${item.id}` : `order-${order.id}`}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="text-center py-2 text-xs text-muted-foreground tabular-nums">
                            {order.order_number ?? "-"}
                          </TableCell>
                          <TableCell className="text-center py-2 text-xs text-muted-foreground tabular-nums">
                            {order.order_date
                              ? format(new Date(order.order_date), "yyyy-MM-dd")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center py-2 text-xs text-muted-foreground tabular-nums">
                            {order.eta_date
                              ? format(new Date(order.eta_date), "yyyy-MM-dd")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge variant="outline" className="text-xs font-normal">
                              {order.warehouse?.name ?? "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2 text-xs">
                            {order.supplier?.name || "-"}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            {item ? (
                              <div className="flex items-center justify-center gap-1.5 text-xs">
                                <ProductImage
                                  imageUrl={item.product?.image_url}
                                  productName={item.product?.name}
                                  size={28}
                                />
                                <span className="font-medium">
                                  {item.product?.name ?? `#${item.product_id}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center py-2 text-xs tabular-nums">
                            {currentStock.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge className="tabular-nums text-xs px-1.5 py-0">
                              {quantity.toLocaleString()}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2 text-xs font-bold text-primary tabular-nums">
                            {total.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Badge
                              variant={isReceived ? "default" : "secondary"}
                              className="text-xs font-normal"
                            >
                              {isReceived ? "تم الاستلام" : "قيد النقل"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center py-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                    disabled={isReceived}
                                  >
                                    <PackageCheck className="h-3.5 w-3.5" />
                                    استلام
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                هذه الميزة قيد التطوير ولا تنفذ أي إجراء حالياً
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
