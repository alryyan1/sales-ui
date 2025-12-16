// src/components/admin/categories/CategoryFormModal.tsx
import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

// MUI components
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Box,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
} from "@mui/material";
import { Loader2, AlertCircle } from "lucide-react";
import categoryService, { Category } from "@/services/CategoryService";

// --- Zod Schema ---
const categoryFormSchema = z.object({
  name: z.string().min(1, { message: "validation:required" }),
  description: z.string().nullable().optional(),
  parent_id: z.union([
    z.number().positive(),
    z.null(),
    z.undefined(),
  ]).optional(),
});
type CategoryFormValues = {
  name: string;
  description?: string | null;
  parent_id?: number | null;
};

// --- Component Props ---
interface CategoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit: Category | null;
  onSaveSuccess: (category: Category) => void;
  allCategories: Category[]; // For parent category dropdown (flat list)
  loadingCategories: boolean; // If parent categories are being loaded
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSaveSuccess,
  allCategories,
  loadingCategories,
}) => {
  const { t } = useTranslation(["categories", "common", "validation"]);
  const isEditMode = Boolean(categoryToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", description: "", parent_id: null },
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
      if (isEditMode && categoryToEdit) {
        reset({
          name: categoryToEdit.name || "",
          description: categoryToEdit.description || "",
          parent_id: categoryToEdit.parent_id || null,
        });
      } else {
        reset();
      }
    }
  }, [isOpen, isEditMode, categoryToEdit, reset]);

  const onSubmit = async (data: CategoryFormValues) => {
    setServerError(null);
    const apiData = { ...data, parent_id: data.parent_id || null }; // Ensure null if empty
    try {
      let savedCategory: Category;
      if (isEditMode && categoryToEdit) {
        savedCategory = await categoryService.updateCategory(
          categoryToEdit.id,
          apiData
        );
      } else {
        savedCategory = await categoryService.createCategory(apiData);
      }
      toast.success(t("common:success"), {
        description: t(
          isEditMode ? "categories:updateSuccess" : "categories:createSuccess"
        ),
      });
      onSaveSuccess(savedCategory);
      onClose();
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const apiErrors = err.response.data.errors;
        Object.keys(apiErrors).forEach((field) => {
          setError(field as keyof CategoryFormValues, {
            type: "server",
            message: t(apiErrors[field][0]),
          });
        });
      } else if (err.response?.data?.message) {
        setServerError(t(err.response.data.message));
      } else {
        setServerError(t("common:unknownError"));
      }
      toast.error(t("common:error"), {
        description: t("categories:saveError"),
      });
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle
        sx={{
          pb: 1.5,
          pt: 3,
          px: 3,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Typography variant="h6" component="div" fontWeight={600}>
          {isEditMode
            ? t("categories:editCategory")
            : t("categories:addCategory")}
        </Typography>
      </DialogTitle>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <DialogContent
          sx={{
            pt: 3,
            px: 3,
            pb: 2,
            maxHeight: "70vh",
            overflowY: "auto",
          }}
        >
          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t("common:error")}</AlertTitle>
              </Box>
              {serverError}
            </Alert>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Name Field */}
            <Controller
              control={control}
              name="name"
              rules={{
                required: t("validation:required"),
              }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={
                    <>
                      {t("categories:nameLabel")}
                      <span style={{ color: "red" }}> *</span>
                    </>
                  }
                  fullWidth
                  size="small"
                  disabled={isSubmitting}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message ? t(fieldState.error.message) : ""}
                />
              )}
            />

            {/* Parent Category Field */}
            <Controller
              control={control}
              name="parent_id"
              render={({ field, fieldState }) => (
                <FormControl
                  fullWidth
                  size="small"
                  disabled={isSubmitting || loadingCategories}
                  error={!!fieldState.error}
                >
                  <InputLabel>{t("categories:parentCategoryLabel")}</InputLabel>
                  <Select
                    {...field}
                    label={t("categories:parentCategoryLabel")}
                    value={field.value ? String(field.value) : ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value && e.target.value !== " "
                          ? Number(e.target.value)
                          : null
                      )
                    }
                  >
                    <MenuItem value=" ">
                      <em>{t("categories:noParent")}</em>
                    </MenuItem>
                    {allCategories
                      .filter(
                        (cat) =>
                          !categoryToEdit || cat.id !== categoryToEdit.id
                      )
                      .map((cat) => (
                        <MenuItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </MenuItem>
                      ))}
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                      {fieldState.error.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            {/* Description Field */}
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t("categories:descriptionLabel")}
                  fullWidth
                  size="small"
                  multiline
                  minRows={3}
                  disabled={isSubmitting}
                  value={field.value ?? ""}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            pb: 3,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button
            type="button"
            onClick={handleClose}
            color="inherit"
            variant="outlined"
            disabled={isSubmitting}
            sx={{ minWidth: 100 }}
          >
            {t("common:cancel")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ minWidth: 100 }}
            startIcon={
              isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : undefined
            }
          >
            {isEditMode ? t("common:update") : t("common:create")}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CategoryFormModal;
