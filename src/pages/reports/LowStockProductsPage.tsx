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
import { useTranslation } from "react-i18next";

const LowStockProductsPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports"]);
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
    <div className="space-y-6" dir={i18n.dir()}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("reports:lowStockProductsPage.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("reports:lowStockProductsPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("reports:stagnantProductsPage.reportFiltersTitle")}</CardTitle>
          <CardDescription>{t("reports:stagnantProductsPage.reportFiltersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="limit">{t("reports:stagnantProductsPage.productsCountLabel")}</Label>
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
            {t("reports:lowStockProductsPage.reportResultsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("reports:stagnantProductsPage.loadingData")}</p>
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t("reports:stagnantProductsPage.errorTitle")}</AlertTitle>
              <AlertDescription>
                {t("reports:stagnantProductsPage.errorLoadingData")}{" "}
                {error instanceof Error ? error.message : t("reports:stagnantProductsPage.unknownError")}
              </AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <PackageX className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{t("reports:lowStockProductsPage.noLowStockProducts")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">{t("reports:lowStockProductsPage.colNumber")}</TableHead>
                    <TableHead className="text-right">{t("reports:lowStockProductsPage.colProduct")}</TableHead>
                    <TableHead className="text-right">{t("reports:lowStockProductsPage.colCategory")}</TableHead>
                    <TableHead className="text-right">{t("reports:lowStockProductsPage.colCurrentStock")}</TableHead>
                    <TableHead className="text-right">{t("reports:lowStockProductsPage.colAlertLevel")}</TableHead>
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
