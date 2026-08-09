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
import { useTranslation } from "react-i18next";

const ShortagesPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports", "common"]);
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
    <div className="space-y-6" dir={i18n.dir()}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("reports:shortagesPage.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("reports:shortagesPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <PackageX className="h-5 w-5 text-destructive" />
              {t("reports:shortagesPage.outOfStockProducts")}
            </CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("reports:shortagesPage.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("common:loading")}</p>
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("reports:shortagesPage.errorTitle")}</AlertTitle>
              <AlertDescription>
                {t("reports:shortagesPage.errorLoadingData")}{" "}
                {error instanceof Error ? error.message : t("reports:shortagesPage.unknownError")}
              </AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <PackageX className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{t("reports:shortagesPage.noShortagesTitle")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t("reports:shortagesPage.colNumber")}</TableHead>
                    <TableHead className="text-right">{t("reports:shortagesPage.colProduct")}</TableHead>
                    <TableHead className="text-right">{t("reports:shortagesPage.colCategory")}</TableHead>
                    <TableHead className="text-right">{t("reports:shortagesPage.colUnitCost")}</TableHead>
                    <TableHead className="text-right">{t("reports:shortagesPage.colLastSalePrice")}</TableHead>
                    <TableHead className="text-center">{t("reports:shortagesPage.colStock")}</TableHead>
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
                          {product.category_name || t("reports:shortagesPage.uncategorized")}
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
