import React from "react";
import { Control } from "react-hook-form";
import { Filter, X, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Supplier } from "../../../services/supplierService";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export interface ReportFilterValues {
  startDate?: Date | null;
  endDate?: Date | null;
  supplierId?: string | null;
  status?: string | null;
}

interface PurchaseReportFiltersProps {
  control: Control<ReportFilterValues>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onClear: () => void;
  isLoading: boolean;
  suppliers: Supplier[];
  loadingSuppliers: boolean;
}

const PurchaseReportFilters: React.FC<PurchaseReportFiltersProps> = ({
  control,
  onSubmit,
  onClear,
  isLoading,
  suppliers,
  loadingSuppliers,
}) => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  return (
    <Card className="mb-6 border-0 shadow-sm bg-white">
      <CardContent className="p-5">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:flex-wrap">
            {/* Start Date */}
            <div className="min-w-full md:min-w-[200px]">
              <FormField
                control={control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t("startDateFieldLabel")}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? null}
                        onChange={field.onChange}
                        placeholder={t("selectStartDatePlaceholder")}
                        disabled={isLoading}
                        error={!!fieldState?.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* End Date */}
            <div className="min-w-full md:min-w-[200px]">
              <FormField
                control={control}
                name="endDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t("endDateFieldLabel")}</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? null}
                        onChange={field.onChange}
                        placeholder={t("selectEndDatePlaceholder")}
                        disabled={isLoading}
                        error={!!fieldState?.error}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Supplier Select */}
            <div className="min-w-full md:min-w-[220px]">
              <FormField
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("supplierLabel")}</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={loadingSuppliers || isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allSuppliersPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t("allSuppliersPlaceholder")}</SelectItem>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Status Select */}
            <div className="min-w-full md:min-w-[180px]">
              <FormField
                control={control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("statusLabel")}</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("allStatusesPlaceholder")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">{t("allStatusesPlaceholder")}</SelectItem>
                        <SelectItem value="received">{t("statusReceived")}</SelectItem>
                        <SelectItem value="pending">{t("statusPending")}</SelectItem>
                        <SelectItem value="ordered">{t("statusOrdered")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-0 md:me-auto md:pt-0">
              <Button
                type="submit"
                disabled={isLoading}
                className="gap-2 px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Filter size={16} />
                )}
                {t("applyButton")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClear}
                disabled={isLoading}
                className="gap-2 px-6"
              >
                <X size={16} />
                {tCommon("clear")}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PurchaseReportFilters;
