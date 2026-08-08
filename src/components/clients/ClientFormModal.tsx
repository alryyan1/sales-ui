// src/components/clients/ClientFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

// Services and Types
import clientService, { Client } from "@/services/clientService";

// --- Types ---
type ClientFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

const CLIENT_FORM_FIELDS: (keyof ClientFormValues)[] = [
  "name",
  "email",
  "phone",
  "address",
];

// --- Component Props ---
interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit: Client | null;
  onSaveSuccess: (client?: Client) => void;
}

// --- Component Definition ---
const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onSaveSuccess,
}) => {
  const isEditMode = Boolean(clientToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ClientFormValues>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
    },
  });

  const {
    handleSubmit,
    reset,
    control,
    formState: { isSubmitting },
    setError,
  } = form;

  // --- Effect to Populate/Reset Form ---
  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (isEditMode && clientToEdit) {
      reset({
        name: clientToEdit.name || "",
        email: clientToEdit.email || "",
        phone: clientToEdit.phone || "",
        address: clientToEdit.address || "",
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        address: "",
      });
    }
  }, [isOpen, isEditMode, clientToEdit, reset]);

  // --- Form Submission Handler ---
  const onSubmit: SubmitHandler<ClientFormValues> = async (data) => {
    setServerError(null);

    // Prepare data for API (ensure empty strings become null if API expects null)
    const dataToSend = {
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    };

    try {
      let savedClient: Client;
      if (isEditMode && clientToEdit) {
        savedClient = await clientService.updateClient(
          clientToEdit.id,
          dataToSend
        );
      } else {
        savedClient = await clientService.createClient(dataToSend);
      }

      toast.success("تم الحفظ بنجاح", {
        description: isEditMode
          ? "تم تحديث بيانات العميل بنجاح"
          : "تم إضافة العميل بنجاح",
        duration: 3000,
      });

      onSaveSuccess(savedClient);
      onClose();
    } catch (err) {
      console.error("Failed to save client:", err);
      const generalError = clientService.getErrorMessage(err);
      const apiErrors = clientService.getValidationErrors(err);

      toast.error("خطأ", {
        description: generalError,
        duration: 5000,
      });

      setServerError(generalError);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          if (CLIENT_FORM_FIELDS.includes(field as keyof ClientFormValues)) {
            setError(field as keyof ClientFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });
        setServerError("يرجى التحقق من الحقول المدخلة.");
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && !open && onClose()}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
          <DialogDescription>
            {isEditMode ? "تعديل بيانات العميل" : "أدخل بيانات العميل الجديد"}
          </DialogDescription>
        </DialogHeader>

        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={control}
                name="name"
                rules={{ required: "الاسم مطلوب" }}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>الاسم</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم العميل" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="email"
                rules={{
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "صيغة البريد الإلكتروني غير صحيحة",
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        dir="ltr"
                        className="text-left"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="phone"
                rules={{ required: "رقم الهاتف مطلوب" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        dir="ltr"
                        className="text-left"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>العنوان</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أدخل عنوان العميل"
                        rows={3}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            إلغاء
          </Button>
          <Button type="submit" form="client-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal;
