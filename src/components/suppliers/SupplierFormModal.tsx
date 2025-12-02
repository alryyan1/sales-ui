// src/components/suppliers/SupplierFormModal.tsx
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
import supplierService, {
  Supplier,
  SupplierFormData,
} from "../../services/supplierService";

// --- Zod Schema for Validation ---
const supplierFormSchema = z.object({
  name: z.string().min(1, { message: "اسم المورد مطلوب" }),
  contact_person: z.string().nullable().optional(),
  email: z
    .string()
    .email({ message: "صيغة البريد الإلكتروني غير صحيحة" })
    .nullable()
    .or(z.literal(""))
    .optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

// --- Component Props ---
interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit: Supplier | null;
  onSaveSuccess: () => void;
}

// --- Component Definition ---
const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  supplierToEdit,
  onSaveSuccess,
}) => {
  const isEditMode = Boolean(supplierToEdit);

  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contact_person: "",
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
      if (isEditMode && supplierToEdit) {
        reset({
          name: supplierToEdit.name || "",
          contact_person: supplierToEdit.contact_person || "",
          email: supplierToEdit.email || "",
          phone: supplierToEdit.phone || "",
          address: supplierToEdit.address || "",
        });
      } else {
        reset({
          name: "",
          contact_person: "",
          email: "",
          phone: "",
          address: "",
        }); // Reset to defaults for adding
      }
    }
  }, [isOpen, isEditMode, supplierToEdit, reset]);

  // --- Form Submission Handler ---
  const onSubmit: SubmitHandler<SupplierFormValues> = async (data) => {
    setServerError(null);
    console.log("Submitting supplier data:", data);

    // Prepare data for API (ensure empty strings become null)
    const dataToSend = {
      ...data,
      contact_person: data.contact_person || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
    };

    try {
      let savedSupplier: Supplier;
      if (isEditMode && supplierToEdit) {
        savedSupplier = await supplierService.updateSupplier(
          supplierToEdit.id,
          dataToSend
        );
      } else {
        savedSupplier = await supplierService.createSupplier(dataToSend);
      }
      console.log("Save successful:", savedSupplier);

      toast.success("تم الحفظ بنجاح", {
        description: isEditMode
          ? "تم تحديث بيانات المورد بنجاح"
          : "تم إضافة المورد بنجاح",
        duration: 3000,
      });

      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error("Failed to save supplier:", err);
      const generalError = supplierService.getErrorMessage(err);
      const apiErrors = supplierService.getValidationErrors(err);

      toast.error("خطأ", {
        description: generalError,
        duration: 5000,
      });
      setServerError(generalError);

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          if (field in ({} as SupplierFormValues)) {
            setError(field as keyof SupplierFormValues, {
              type: "server",
              message: messages[0],
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
      <DialogTitle>
        {isEditMode ? "تعديل مورد" : "إضافة مورد"}
      </DialogTitle>
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
                label="اسم المورد"
                fullWidth
                required
                placeholder="أدخل اسم المورد"
                disabled={isSubmitting}
                {...register("name")}
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            </Box>

            <TextField
              label="مسؤول التواصل"
              fullWidth
              placeholder="اسم الشخص المسؤول"
              disabled={isSubmitting}
              {...register("contact_person")}
              error={!!errors.contact_person}
              helperText={errors.contact_person?.message}
            />

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
                placeholder="أدخل عنوان المورد"
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
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
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

export default SupplierFormModal;
