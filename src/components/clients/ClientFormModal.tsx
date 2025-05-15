// src/components/clients/ClientFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";
// No Alert component added via shadcn add initially, use styled div or add it
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Services and Types
import clientService, {
  Client,
  ClientFormData,
} from "../../services/clientService"; // Adjust path

// --- Zod Schema for Validation ---
const clientFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }),
  // Email: optional, but if present, must be valid email format
  email: z
    .string()
    .email({ message: "validation:email" })
    .nullable()
    .or(z.literal("")) // Allow empty string from input, treat as null/undefined later
    .optional(),
  phone: z.string().nullable().optional(), // Optional string
  address: z.string().nullable().optional(), // Optional string
});

// Infer TypeScript type from the Zod schema
type ClientFormValues = z.infer<typeof clientFormSchema>;

// --- Component Props ---
interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientToEdit: Client | null;
  onSaveSuccess: () => void;
}

// --- Component Definition ---
const ClientFormModal: React.FC<ClientFormModalProps> = ({
  isOpen,
  onClose,
  clientToEdit,
  onSaveSuccess,
}) => {
  const { t } = useTranslation(["clients", "common", "validation"]);
  const isEditMode = Boolean(clientToEdit);

  // State for general API errors
  const [serverError, setServerError] = useState<string | null>(null);

  // --- React Hook Form Setup with Zod ---
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      // Match schema expectations
      name: "",
      email: "", // Zod handles nullable/optional/empty string
      phone: "",
      address: "",
    },
  });

  const {
    handleSubmit,
    control,
    reset,
    formState: { isSubmitting },
    setError,
  } = form;

  // --- Effect to Populate/Reset Form ---
  useEffect(() => {
    if (isOpen) {
      setServerError(null); // Clear server errors on open
      if (isEditMode && clientToEdit) {
        // Populate form with existing data
        reset({
          name: clientToEdit.name || "",
          email: clientToEdit.email || "", // Use empty string for null from API
          phone: clientToEdit.phone || "",
          address: clientToEdit.address || "",
        });
      } else {
        // Reset to default values for adding
        reset({
          // Match schema expectations
          name: "",
          email: "", // Zod handles nullable/optional/empty string
          phone: "",
          address: "",
        });
      }
    }
  }, [isOpen, isEditMode, clientToEdit, reset]);

  // --- Form Submission Handler ---
  const onSubmit: SubmitHandler<ClientFormValues> = async (data) => {
    setServerError(null);
    console.log("Submitting client data:", data);

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
      console.log("Save successful:", savedClient);

      // Show success toast using Sonner
      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "clients:saveSuccess" : "clients:saveSuccess"
        ),
        duration: 3000,
      });

      onSaveSuccess(); // Call parent callback
      onClose(); // Close the modal
    } catch (err) {
      console.error("Failed to save client:", err);
      const generalError = clientService.getErrorMessage(err);
      const apiErrors = clientService.getValidationErrors(err);

      // Show error toast using Sonner
      toast.error(t("common:error"), {
        description: generalError,
        duration: 5000,
      });

      // Display general error within the modal
      setServerError(generalError);

      // Map API validation errors back to form fields
      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          if (field in ({} as ClientFormValues)) {
            setError(field as keyof ClientFormValues, {
              type: "server",
              message: messages[0], // Show first server error
            });
          }
        });
        // Optionally update general error message
        setServerError(t("validation:checkFields"));
      }
    }
    // isSubmitting automatically handled by RHF
  };

  // --- Render Modal ---
  if (!isOpen) return null;

  return (
    // shadcn Dialog component
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl p-0">
        {" "}
        {/* Adjusted max-width, remove default padding */}
        <Form {...form}>
          {/* Standard form tag for RHF */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Dialog Header */}
            <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isEditMode ? t("clients:editClient") : t("clients:addClient")}
              </DialogTitle>
              {/* Removed description, title is usually enough */}
            </DialogHeader>
            {/* Scrollable Content Area */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* General Server Error Alert (Using styled div as Alert might not be added) */}
              {serverError && !isSubmitting && (
                <div
                  className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded mb-4 dark:bg-red-900 dark:text-red-200 dark:border-red-600"
                  role="alert"
                >
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 me-2" />
                    <p>{serverError}</p>
                  </div>
                </div>
                // Or if you added Alert component:
                // <Alert variant="destructive" className="mb-4">
                //     <AlertCircle className="h-4 w-4" />
                //     <AlertTitle>{t('common:error')}</AlertTitle>
                //     <AlertDescription>{serverError}</AlertDescription>
                // </Alert>
              )}
              {/* Grid layout for fields using Tailwind */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name Field */}
                <FormField
                  control={control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      {" "}
                      {/* Span full width */}
                      <FormLabel>
                        {t("clients:name")}{" "}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("clients:namePlaceholder")}
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage /> {/* Displays Zod/RHF validation error */}
                    </FormItem>
                  )}
                />

                {/* Email Field */}
                <FormField
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients:email")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("clients:emailPlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Field */}
                <FormField
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("clients:phone")}</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder={t("clients:phonePlaceholder")}
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address Field */}
                <FormField
                  control={control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      {" "}
                      {/* Span full width */}
                      <FormLabel>{t("clients:address")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("clients:addressPlaceholder")}
                          className="resize-y min-h-[80px]"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>{" "}
              {/* End Grid */}
            </div>{" "}
            {/* End Scrollable Content */}
            {/* Dialog Footer with Actions */}
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
                {t("common:save")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal;
