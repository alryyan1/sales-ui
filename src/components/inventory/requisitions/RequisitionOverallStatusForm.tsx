// src/components/inventory/requisitions/RequisitionOverallStatusForm.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RequisitionOverallStatusFormProps {
  isSubmitting: boolean;
}

export const RequisitionOverallStatusForm: React.FC<
  RequisitionOverallStatusFormProps
> = ({ isSubmitting }) => {
  const { t } = useTranslation(["inventory", "common", "validation"]);
  const { control, watch } = useFormContext();
  const overallFormStatus = watch("status");

  return (
    <Card className="dark:bg-gray-900">
      <CardHeader>
        <CardTitle>{t("inventory:processingActions")}</CardTitle>
      </CardHeader>
      {/* Add key */}
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="status"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  {t("inventory:overallRequisitionStatus")}
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select overall status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="approved">
                      {t("inventory:status_approved")}
                    </SelectItem>
                    <SelectItem value="partially_issued">
                      {t("inventory:status_partially_issued")}
                    </SelectItem>
                    <SelectItem value="issued">
                      {t("inventory:status_issued")}
                    </SelectItem>
                    <SelectItem value="rejected">
                      {t("inventory:status_rejected")}
                    </SelectItem>
                    <SelectItem value="cancelled">
                      {t("inventory:status_cancelled")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(overallFormStatus === "issued" ||
            overallFormStatus === "partially_issued") && (
            <FormField
              control={control}
              name="issue_date"
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>
                    {t("inventory:issueDate")}
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Popover>
                    
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          disabled={isSubmitting}
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          
                          <CalendarIcon className="me-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{t("common:pickDate")}</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || isSubmitting}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        <FormField
          control={control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("inventory:managerNotes")}</FormLabel>
              <FormControl>
                <Textarea
                  className="min-h-[60px]"
                  {...field}
                  value={field.value ?? ""}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
