// src/components/clients/ClientFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
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
  CircularProgress,
} from "@mui/material";

// Services and Types
import clientService, { Client } from "../../services/clientService";

// --- Types ---
type ClientFormValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

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
    <Dialog
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      dir="rtl" // Ensure RTL direction if needed for Arabic
    >
      <DialogTitle sx={{ fontWeight: 600 }}>
        {isEditMode ? "تعديل عميل" : "إضافة عميل"}
      </DialogTitle>
      <DialogContent dividers>
        <Box
          component="form"
          id="client-form"
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
                {...register("name", { required: "الاسم مطلوب" })}
                error={!!errors.name}
                helperText={errors.name?.message}
                size="small"
              />
            </Box>

            <TextField
              label="البريد الإلكتروني"
              type="email"
              fullWidth
              placeholder="example@email.com"
              disabled={isSubmitting}
              {...register("email", {
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "صيغة البريد الإلكتروني غير صحيحة",
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              size="small"
            />

            <TextField
              label="رقم الهاتف"
              type="tel"
              fullWidth
              required
              placeholder="05xxxxxxxx"
              disabled={isSubmitting}
              {...register("phone", { required: "رقم الهاتف مطلوب" })}
              error={!!errors.phone}
              helperText={errors.phone?.message}
              size="small"
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
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          type="button"
          variant="outlined"
          onClick={onClose}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          form="client-form"
          variant="contained"
          disabled={isSubmitting}
          startIcon={
            isSubmitting && <CircularProgress size={20} color="inherit" />
          }
        >
          حفظ
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientFormModal;
