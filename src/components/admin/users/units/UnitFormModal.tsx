// src/components/admin/units/UnitFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// shadcn/ui & Lucide
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import unitService, { Unit, UnitFormData } from "@/services/UnitService";

// --- Zod Schema ---
const unitFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }),
  type: z.enum(['stocking', 'sellable'], { message: "validation:required" }),
  description: z.string().optional(),
  is_active: z.boolean(),
});
type UnitFormValues = z.infer<typeof unitFormSchema>;

// --- Component Props ---
interface UnitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  unitToEdit: Unit | null;
  onSaveSuccess: (unit: Unit) => void;
  defaultType?: 'stocking' | 'sellable'; // For pre-selecting type when creating from product form
}

const UnitFormModal: React.FC<UnitFormModalProps> = ({
  isOpen,
  onClose,
  unitToEdit,
  onSaveSuccess,
  defaultType,
}) => {
  const { t } = useTranslation(["units", "common", "validation"]);
  const isEditMode = Boolean(unitToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<UnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: { 
      name: "", 
      type: defaultType || 'stocking', 
      description: "", 
      is_active: true 
    },
  });
  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
    setError,
  } = form;

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      if (isEditMode && unitToEdit) {
        reset({
          name: unitToEdit.name || "",
          type: unitToEdit.type,
          description: unitToEdit.description || "",
          is_active: unitToEdit.is_active,
        });
      } else {
        reset({
          name: "",
          type: defaultType || 'stocking',
          description: "",
          is_active: true,
        });
      }
    }
  }, [isOpen, isEditMode, unitToEdit, reset, defaultType]);

  const onSubmit: SubmitHandler<UnitFormValues> = async (data) => {
    setServerError(null);
    console.log("Submitting unit data:", data);

    const dataToSend: UnitFormData = {
      name: data.name.trim(),
      type: data.type,
      description: data.description?.trim() || undefined,
      is_active: data.is_active,
    };

    try {
      let savedUnit: Unit;
      if (isEditMode && unitToEdit) {
        savedUnit = await unitService.updateUnit(unitToEdit.id, dataToSend);
      } else {
        savedUnit = await unitService.createUnit(dataToSend);
      }
      console.log("Save successful:", savedUnit);

      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "units:updateSuccess" : "units:createSuccess"
        ),
        duration: 3000,
      });

      onSaveSuccess(savedUnit);
      onClose();
    } catch (err) {
      console.error("Failed to save unit:", err);
      const generalError = unitService.getErrorMessage(err);
      const apiErrors = unitService.getValidationErrors(err);

      toast.error(t("common:error"), {
        description: generalError,
        duration: 5000,
      });
      setServerError(generalError);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof UnitFormValues, {
            type: "server",
            message: messages[0],
          });
        });
        setServerError(t("validation:checkFields"));
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isEditMode
                  ? t("units:editUnit")
                  : t("units:addUnit")}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4">
              {/* General Server Error Alert */}
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{t("common:error")}</AlertTitle>
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Name Field */}
              <FormField
                control={control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                      {t("units:name")}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        className="bg-white dark:bg-gray-900 dark:text-gray-100"
                        placeholder={t("units:namePlaceholder")}
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Type Field */}
              <FormField
                control={control}
                name="type"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                      {t("units:type")}
                      <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-900 dark:text-gray-100">
                          <SelectValue placeholder={t("units:selectType")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stocking">
                          {t("units:stockingUnit")}
                        </SelectItem>
                        <SelectItem value="sellable">
                          {t("units:sellableUnit")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={control}
                name="description"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                      {t("units:description")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className="resize-y min-h-[80px] bg-white dark:bg-gray-900 dark:text-gray-100"
                        placeholder={t("units:descriptionPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />

              {/* Active Status Field */}
              <FormField
                control={control}
                name="is_active"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-gray-900 dark:text-gray-100">
                      {t("units:status")}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'true')}
                      value={field.value ? 'true' : 'false'}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-gray-900 dark:text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">
                          {t("units:active")}
                        </SelectItem>
                        <SelectItem value="false">
                          {t("units:inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage>
                      {fieldState.error?.message
                        ? t(fieldState.error.message)
                        : null}
                    </FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>
                  {t("common:cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                )}
                {isEditMode ? t("common:update") : t("common:create")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default UnitFormModal; 