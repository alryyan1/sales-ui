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
import { Loader2, PackageX, AlertCircle, Calendar } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import reportService from "@/services/reportService";

const StagnantProductsPage: React.FC = () => {
  const [months, setMonths] = useState<number>(3);
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stagnant-products", months, limit],
    queryFn: () => reportService.getStagnantProducts(months, limit),
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">المنتجات الراكدة</h1>
        <p className="text-muted-foreground mt-2">
          عرض المنتجات التي تمتلك مخزونًا ولم تُبع خلال فترة زمنية محددة.
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
              <Label htmlFor="months">الفترة (بالأشهر)</Label>
              <Input
                id="months"
                type="number"
                min={1}
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                placeholder="3"
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
                placeholder="20"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-destructive" />
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
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>ممتاز! لا توجد منتجات راكدة مطابقة لهذه الفترة.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">م</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">
                      المخزون المتكدس
                    </TableHead>
                    <TableHead className="text-right">
                      إجمالي المبيعات (تاريخياً)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((product, index) => (
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
                        <Badge variant="outline">{product.category_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="font-semibold">
                          {product.stock_quantity}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-muted-foreground">
                        {product.lifetime_sales}
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

export default StagnantProductsPage;
