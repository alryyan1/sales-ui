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
import { Loader2, TrendingUp, Package, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import reportService from "@/services/reportService";

const BestSellingProductsPage: React.FC = () => {
  const [days, setDays] = useState<number>(30);
  const [limit, setLimit] = useState<number>(10);
  const [productName, setProductName] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "best-selling-products",
      days,
      limit,
      productName,
      startDate,
      endDate,
    ],
    queryFn: () =>
      reportService.getBestSellingProducts(days, limit, {
        productName: productName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          المنتجات الأكثر مبيعاً
        </h1>
        <p className="text-muted-foreground mt-2">
          عرض المنتجات الأكثر مبيعاً خلال فترة زمنية محددة.
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
              <Label htmlFor="product-name">اسم المنتج</Label>
              <Input
                id="product-name"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="ابحث باسم المنتج..."
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="start-date">من تاريخ</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={endDate || undefined}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end-date">إلى تاريخ</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="days">
                الفترة (بالأيام)
                {(startDate || endDate) && (
                  <span className="text-xs text-muted-foreground mr-2">
                    (متجاهلة عند تحديد فترة زمنية)
                  </span>
                )}
              </Label>
              <Input
                id="days"
                type="number"
                min={1}
                value={days}
                disabled={Boolean(startDate && endDate)}
                onChange={(e) => setDays(Number(e.target.value))}
                placeholder="30"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="limit">عدد المنتجات</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                placeholder="10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
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
          ) : !data || data.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>لا توجد بيانات متاحة لهذه الفترة.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">م</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">
                      إجمالي المبيعات
                    </TableHead>
                    <TableHead className="text-right">المخزون الحالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((product, index) => (
                    <TableRow key={product.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-10 w-10 rounded-md object-cover border"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-secondary flex items-center justify-center border">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
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
                        <Badge variant="outline">{product.category_name}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-blue-600 dark:text-blue-400">
                        {product.total_quantity_sold}
                      </TableCell>
                      <TableCell className="font-semibold text-green-600 dark:text-green-400">
                        {product.total_revenue}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            product.current_stock > 10
                              ? "success"
                              : product.current_stock > 0
                                ? "outline"
                                : "destructive"
                          }
                        >
                          {product.current_stock}
                        </Badge>
                      </TableCell>
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

export default BestSellingProductsPage;
