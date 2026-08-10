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
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import reportService from "@/services/reportService";

const StagnantProductsPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction } = useLanguage();
  const [months, setMonths] = useState<number>(3);
  const [limit, setLimit] = useState<number>(20);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["stagnant-products", months, limit],
    queryFn: () => reportService.getStagnantProducts(months, limit),
  });

  return (
    <div className="space-y-6" dir={direction}>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("stagnantProductsTitle")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("stagnantProductsSubtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("reportFiltersTitle")}</CardTitle>
          <CardDescription>{t("reportFiltersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="months">{t("periodInMonthsLabel")}</Label>
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
              <Label htmlFor="limit">{t("productsCountLabel")}</Label>
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
            {t("reportResultsTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("loadingDataEllipsis")}</p>
            </div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{tCommon("error")}</AlertTitle>
              <AlertDescription>
                {t("errorLoadingDataPrefix")}{" "}
                {error instanceof Error ? error.message : t("unknownErrorText")}
              </AlertDescription>
            </Alert>
          ) : !data || data.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{t("noStagnantProductsFound")}</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t("rowNumberColumn")}</TableHead>
                    <TableHead className="text-start">{t("productLabel")}</TableHead>
                    <TableHead className="text-start">{t("productCategoryColumn")}</TableHead>
                    <TableHead className="text-start">
                      {t("stagnantStockColumn")}
                    </TableHead>
                    <TableHead className="text-start">
                      {t("totalHistoricalSalesColumn")}
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
