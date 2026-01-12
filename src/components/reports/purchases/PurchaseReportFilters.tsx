import React from "react";
import { Control } from "react-hook-form";
import { Filter, X, Loader2 } from "lucide-react";
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
                    <FormLabel>تاريخ البدء</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? null}
                        onChange={field.onChange}
                        placeholder="اختر تاريخ البدء"
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
                    <FormLabel>تاريخ الانتهاء</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value ?? null}
                        onChange={field.onChange}
                        placeholder="اختر تاريخ الانتهاء"
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
                    <FormLabel>المورد</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={loadingSuppliers || isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="جميع الموردين" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">جميع الموردين</SelectItem>
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
                    <FormLabel>الحالة</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="جميع الحالات" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">جميع الحالات</SelectItem>
                        <SelectItem value="received">تم الاستلام</SelectItem>
                        <SelectItem value="pending">معلق</SelectItem>
                        <SelectItem value="ordered">تم الطلب</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-0 md:ml-auto md:pt-0">
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
                تطبيق
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClear}
                disabled={isLoading}
                className="gap-2 px-6"
              >
                <X size={16} />
                مسح
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default PurchaseReportFilters;
