// src/components/clients/ClientFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
} from "@mui/material";
import { Loader2 } from "lucide-react";

// Services and Types
import clientService, { Client } from "../../services/clientService";

// --- Zod Schema for Validation ---
const clientFormSchema = z.object({
  name: z.string().min(1, { message: "الاسم مطلوب" }),
  email: z
    .string()
    .email({ message: "صيغة البريد الإلكتروني غير صحيحة" })
    .nullable()
    .or(z.literal(""))
    .optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

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
    resolver: zodResolver(clientFormSchema),
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
    register,
    formState: { isSubmitting, errors },
    setError,
  } = form;

  // --- Effect to Populate/Reset Form ---
  useEffect(() => {
    if (isOpen) {
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

      toast.success("تم الحفظ بنجاح", {
        description: isEditMode
          ? "تم تحديث بيانات العميل بنجاح"
          : "تم إضافة العميل بنجاح",
        duration: 3000,
      });

      onSaveSuccess(savedClient); // Pass client back
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
          if (field in ({} as ClientFormValues)) {
            setError(field as keyof ClientFormValues, {
              type: "server",
              message: messages[0], // Show first server error
            });
          }
        });
        setServerError("يرجى التحقق من الحقول المدخلة.");
      }
    }
  };

  // --- Render Modal ---
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? "تعديل عميل" : "إضافة عميل"}</DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1 }}
        >
          {serverError && !isSubmitting && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}>
              <TextField
                label="الاسم"
                fullWidth
                required
                placeholder="أدخل اسم العميل"
                disabled={isSubmitting}
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Box>

            <TextField
              label="البريد الإلكتروني"
              type="email"
              fullWidth
              placeholder="example@email.com"
              disabled={isSubmitting}
              {...register("email")}
              error={!!errors.email}
              helperText={errors.email?.message}
            />

            <TextField
              label="رقم الهاتف"
              type="tel"
              fullWidth
              placeholder="05xxxxxxxx"
              disabled={isSubmitting}
              {...register("phone")}
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />

            <Box sx={{ gridColumn: { xs: "span 1", sm: "span 2" } }}>
              <TextField
                label="العنوان"
                fullWidth
                multiline
                minRows={3}
                placeholder="أدخل عنوان العميل"
                disabled={isSubmitting}
                {...register("address")}
                error={!!errors.address}
                helperText={errors.address?.message}
              />
            </Box>
          </Box>

          <DialogActions sx={{ mt: 2 }}>
            <Button
              type="button"
              variant="outlined"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              حفظ
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormModal;
