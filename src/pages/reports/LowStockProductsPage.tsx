import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle, AlertTriangle, PackageX } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import productService from "@/services/productService";

const LowStockProductsPage: React.FC = () => {
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["low-stock-products", limit],
    queryFn: () =>
      productService.getProducts(
        1,
        "",
        "stock_quantity",
        "asc",
        limit,
        null,
        false,
        true,
      ),
  });

  const products = data?.data ?? [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          المنتجات منخفضة المخزون
        </h1>
        <p className="text-muted-foreground mt-2">
          عرض المنتجات التي وصل مخزونها إلى حد التنبيه أو أقل.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>فلاتر التقرير</CardTitle>
          <CardDescription>تخصيص البيانات المعروضة في التقرير</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="limit">عدد المنتجات</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                placeholder="20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            نتائج التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">جاري تحميل البيانات...</p>
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>
                حدث خطأ أثناء تحميل البيانات:{" "}
                {error instanceof Error ? error.message : "خطأ غير معروف"}
              </AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <PackageX className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>ممتاز! لا توجد منتجات منخفضة المخزون حالياً.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">م</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">المخزون الحالي</TableHead>
                    <TableHead className="text-right">حد التنبيه</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.sku && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {product.sku}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {product.category_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (product.current_stock_quantity ??
                              product.stock_quantity) > 0
                              ? "outline"
                              : "destructive"
                          }
                        >
                          {product.current_stock_quantity ??
                            product.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell>{product.stock_alert_level ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LowStockProductsPage;
