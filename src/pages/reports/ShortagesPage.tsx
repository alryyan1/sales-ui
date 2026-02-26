import React, { useState, useEffect, useRef } from "react";
import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, AlertCircle, PackageX, Search } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatCurrency } from "@/constants";

const ShortagesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const { data, isLoading, isError, error } = useProducts({
    perPage: 100,
    search: debouncedSearchTerm,
    outOfStockOnly: true,
  });

  const products = data?.pages.flatMap((page) => page.data) || [];

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الطلبية (النواقص)</h1>
        <p className="text-muted-foreground mt-2">
          قائمة بالمنتجات التي نفدت كميتها من المخزون وتحتاج إلى إعادة طلب.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <PackageX className="h-5 w-5 text-destructive" />
              المنتجات المخلصة
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن منتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-9"
              />
            </div>
          </div>
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
              <p>لا توجد منتجات نواقص حالياً. جميع المنتجات متوفرة.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">م</TableHead>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">التصنيف</TableHead>
                    <TableHead className="text-right">تكلفة الوحدة</TableHead>
                    <TableHead className="text-right">آخر سعر بيع</TableHead>
                    <TableHead className="text-center">المخزون</TableHead>
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
                        <Badge variant="secondary">
                          {product.category_name || "غير مصنف"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          Number(product.latest_purchase_cost || 0),
                        )}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(Number(product.sale_price || 0))}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive">
                          {product.stock_quantity}
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

export default ShortagesPage;
