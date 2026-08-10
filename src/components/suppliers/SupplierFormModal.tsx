// src/components/suppliers/SupplierFormModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Loader2, AlertCircle } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

import supplierService, { Supplier, SupplierFormData } from "@/services/supplierService";
import { useLanguage } from "@/context/LanguageContext";

function createSupplierFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(1, { message: t("nameRequired") }),
    contact_person: z.string().nullable().optional(),
    email: z
      .string()
      .email({ message: t("invalidEmailFormat") })
      .nullable()
      .or(z.literal(""))
      .optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    is_client: z.boolean().optional(),
  });
}

type SupplierFormValues = z.infer<ReturnType<typeof createSupplierFormSchema>>;

const FORM_FIELD_KEYS: (keyof SupplierFormValues)[] = [
  "name",
  "contact_person",
  "email",
  "phone",
  "address",
  "is_client",
];

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit: Supplier | null;
  onSaveSuccess: () => void;
}

const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSaveSuccess,
}) => {
  const isEditMode = Boolean(supplierToEdit);
  const [serverError, setServerError] = useState<string | null>(null);
  const { direction } = useLanguage();
  const { t } = useTranslation("suppliers");
  const { t: tCommon } = useTranslation("common");
  const supplierFormSchema = useMemo(() => createSupplierFormSchema(t), [t]);

  const {
    handleSubmit,
    reset,
    control,
    register,
    setError,
    formState: { isSubmitting, errors },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contact_person: "",
      email: "",
      phone: "",
      address: "",
      is_client: false,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (isEditMode && supplierToEdit) {
      reset({
        name: supplierToEdit.name || "",
        contact_person: supplierToEdit.contact_person || "",
        email: supplierToEdit.email || "",
        phone: supplierToEdit.phone || "",
        address: supplierToEdit.address || "",
        is_client: supplierToEdit.is_client ?? false,
      });
    } else {
      reset({
        name: "",
        contact_person: "",
        email: "",
        phone: "",
        address: "",
        is_client: false,
      });
    }
  }, [isOpen, isEditMode, supplierToEdit, reset]);

  const onSubmit: SubmitHandler<SupplierFormValues> = async (data) => {
    setServerError(null);
    const dataToSend: SupplierFormData = {
      ...data,
      contact_person: data.contact_person || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    };

    try {
      if (isEditMode && supplierToEdit) {
        await supplierService.updateSupplier(supplierToEdit.id, dataToSend);
      } else {
        await supplierService.createSupplier(dataToSend);
      }
      toast.success(t("savedSuccessfully"), {
        description: isEditMode ? t("supplierUpdatedSuccess") : t("supplierAddedSuccess"),
      });
      onSaveSuccess();
      onClose();
    } catch (err) {
      const generalError = supplierService.getErrorMessage(err);
      const apiErrors = supplierService.getValidationErrors(err);
      toast.error(t("failedToSave"), { description: generalError });
      setServerError(apiErrors ? t("checkFieldsError") : generalError);
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          if (FORM_FIELD_KEYS.includes(field as keyof SupplierFormValues)) {
            setError(field as keyof SupplierFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });
      }
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent dir={direction} className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEditMode ? t("editSupplierShort") : t("addSupplierShort")}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? t("updateContactInfoDesc")
                : t("enterNewSupplierDataDesc")}
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>{t("failedToSave")}</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplier-name">{t("nameFieldLabel")}</Label>
              <Input
                id="supplier-name"
                autoFocus
                placeholder={t("enterSupplierNamePlaceholder")}
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplier-contact">{t("contactPersonFieldLabel")}</Label>
              <Input
                id="supplier-contact"
                placeholder={t("contactPersonPlaceholderShort")}
                disabled={isSubmitting}
                {...register("contact_person")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplier-email">{t("email")}</Label>
              <Input
                id="supplier-email"
                type="email"
                placeholder="example@email.com"
                disabled={isSubmitting}
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplier-phone">{t("phone")}</Label>
              <Input
                id="supplier-phone"
                type="tel"
                placeholder="05xxxxxxxx"
                disabled={isSubmitting}
                {...register("phone")}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="supplier-address">{t("address")}</Label>
              <Textarea
                id="supplier-address"
                rows={3}
                placeholder={t("enterSupplierAddressPlaceholder")}
                disabled={isSubmitting}
                {...register("address")}
              />
            </div>
          </div>

          <Separator />

          <Controller
            control={control}
            name="is_client"
            render={({ field }) => (
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg -mx-2 px-2 py-1.5">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-foreground">{t("supplierIsAlsoClient")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("clientRecordWillBeCreatedDesc")}
                  </p>
                </div>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                  className="mt-0.5 shrink-0"
                />
              </label>
            )}
          />

          {isEditMode && supplierToEdit?.is_client && (
            <p className="text-xs text-muted-foreground">
              {t("linkedToClientAccountHint")}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-24 gap-2">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplierFormModal;
