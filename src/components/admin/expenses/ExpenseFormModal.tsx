// src/components/admin/expenses/ExpenseFormModal.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Grid,
  Alert,
} from "@mui/material";
import { X, Plus } from "lucide-react";

import expenseService, {
  Expense,
  ExpenseFormData,
} from "@/services/expenseService";
import expenseCategoryService, {
  ExpenseCategory,
} from "@/services/ExpenseCategoryService";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit: Expense | null;
  onSaveSuccess: (expense: Expense) => void;
  shiftId?: number | null;
}

type ExpenseFormFields = {
  title: string;
  amount: string | number;
  expense_date: string;
  expense_category_id: string;
  payment_method?: string;
  reference?: string;
  description?: string;
};

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
  onSaveSuccess,
  shiftId,
}) => {
  const isEditMode = Boolean(expenseToEdit);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryServerError, setCategoryServerError] = useState<string | null>(
    null
  );

  const {
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting },
    setValue,
  } = useForm<ExpenseFormFields>({
    defaultValues: {
      title: "",
      amount: "",
      expense_date: "",
      expense_category_id: "",
      payment_method: "cash",
      reference: "",
      description: "",
    },
  });

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await expenseCategoryService.getCategories(
        1,
        9999,
        "",
        true
      );
      setCategories(data as ExpenseCategory[]);
    } catch {
      // ignore
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    fetchCategories();
    if (isEditMode && expenseToEdit) {
      reset({
        title: expenseToEdit.title ?? "",
        amount: String(expenseToEdit.amount ?? ""),
        expense_date: expenseToEdit.expense_date ?? "",
        expense_category_id: expenseToEdit.expense_category_id
          ? String(expenseToEdit.expense_category_id)
          : "",
        payment_method: expenseToEdit.payment_method ?? "",
        reference: expenseToEdit.reference ?? "",
        description: expenseToEdit.description ?? "",
      });
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      reset({
        title: "",
        amount: "",
        expense_date: `${yyyy}-${mm}-${dd}`,
        expense_category_id: "",
        payment_method: "cash",
        reference: "",
        description: "",
      });
    }
  }, [isOpen, isEditMode, expenseToEdit, reset, fetchCategories]);

  const onSubmit = async (data: ExpenseFormFields) => {
    setServerError(null);
    const payload: ExpenseFormData = {
      title: data.title,
      amount: Number(data.amount),
      expense_date: data.expense_date,
      expense_category_id: data.expense_category_id
        ? Number(data.expense_category_id)
        : null,
      payment_method: data.payment_method ? data.payment_method : null,
      reference: data.reference ? data.reference : null,
      description: data.description ? data.description : null,
      shift_id: shiftId ?? null,
    };
    try {
      let saved: Expense;
      if (isEditMode && expenseToEdit) {
        saved = await expenseService.updateExpense(expenseToEdit.id, payload);
      } else {
        saved = await expenseService.createExpense(payload);
      }
      onSaveSuccess(saved);
      onClose();
    } catch (err) {
      setServerError(expenseService.getErrorMessage(err));
      const apiErrors = expenseService.getValidationErrors(err);
      if (apiErrors) {
        (
          Object.entries(apiErrors) as [keyof ExpenseFormFields, string[]][]
        ).forEach(([field, messages]) => {
          setError(field as keyof ExpenseFormFields, {
            type: "server",
            message: (messages as string[])[0],
          });
        });
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryServerError(null);
    if (!newCategoryName.trim()) {
      setCategoryServerError("الاسم مطلوب");
      return;
    }
    setIsSavingCategory(true);
    try {
      const saved = await expenseCategoryService.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || null,
      });
      setCategories((prev) => [saved as ExpenseCategory, ...prev]);
      setValue("expense_category_id", String((saved as ExpenseCategory).id));
      setIsCategoryModalOpen(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
    } catch (error) {
      setCategoryServerError(expenseCategoryService.getErrorMessage(error));
    } finally {
      setIsSavingCategory(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 },
        }}
      >
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogTitle
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              pb: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              {isEditMode ? "تعديل المصروف" : "إضافة مصروف"}
            </Typography>
            <IconButton onClick={onClose} size="small">
              <X size={20} />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {serverError && <Alert severity="error">{serverError}</Alert>}

              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="title"
                    control={control}
                    rules={{ required: "اسم المصروف مطلوب" }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="اسم المصروف"
                        fullWidth
                        size="small"
                        autoFocus
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="amount"
                    control={control}
                    rules={{ required: "المبلغ مطلوب" }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="المبلغ"
                        type="number"
                        fullWidth
                        size="small"
                        onFocus={(e) => e.target.select()}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="expense_date"
                    control={control}
                    rules={{ required: "التاريخ مطلوب" }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="التاريخ"
                        type="date"
                        fullWidth
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="expense_category_id"
                    control={control}
                    render={({ field, fieldState }) => (
                      <FormControl
                        fullWidth
                        size="small"
                        error={!!fieldState.error}
                      >
                        <InputLabel shrink>الفئة</InputLabel>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Select
                            {...field}
                            label="الفئة"
                            fullWidth
                            displayEmpty
                            disabled={isSubmitting || loadingCategories}
                            sx={{ flex: 1 }}
                          >
                            <MenuItem value="">
                              {loadingCategories
                                ? "جاري التحميل..."
                                : "لا توجد فئة"}
                            </MenuItem>
                            {categories.map((cat) => (
                              <MenuItem key={cat.id} value={String(cat.id)}>
                                {cat.name}
                              </MenuItem>
                            ))}
                          </Select>
                          <IconButton
                            color="primary"
                            onClick={() => setIsCategoryModalOpen(true)}
                            disabled={isSubmitting}
                            sx={{
                              border: "1px solid",
                              borderColor: "primary.main",
                              borderRadius: 1,
                            }}
                            size="small"
                          >
                            <Plus size={20} />
                          </IconButton>
                        </Box>
                        {fieldState.error && (
                          <Typography variant="caption" color="error">
                            {fieldState.error.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="payment_method"
                    control={control}
                    render={({ field, fieldState }) => (
                      <FormControl
                        fullWidth
                        size="small"
                        error={!!fieldState.error}
                      >
                        <InputLabel>طريقة الدفع</InputLabel>
                        <Select
                          {...field}
                          label="طريقة الدفع"
                          fullWidth
                          disabled={isSubmitting}
                        >
                          <MenuItem value="">اختر طريقة الدفع</MenuItem>
                          <MenuItem value="cash">نقدي (Cash)</MenuItem>
                          <MenuItem value="bank">بنك (Bank)</MenuItem>
                        </Select>
                        {fieldState.error && (
                          <Typography variant="caption" color="error">
                            {fieldState.error.message}
                          </Typography>
                        )}
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Controller
                    name="reference"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="المرجع"
                        fullWidth
                        size="small"
                        placeholder="أدخل رقم المرجع"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="الوصف"
                        multiline
                        rows={3}
                        fullWidth
                        size="small"
                        placeholder="أدخل وصف المصروف"
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={onClose} disabled={isSubmitting} color="inherit">
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {isEditMode ? "تحديث" : "إنشاء"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={isCategoryModalOpen}
        onClose={() => !isSavingCategory && setIsCategoryModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <form onSubmit={handleCreateCategory} noValidate>
          <DialogTitle>إضافة فئة</DialogTitle>
          <DialogContent>
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}
            >
              {categoryServerError && (
                <Alert severity="error">{categoryServerError}</Alert>
              )}
              <TextField
                label="الاسم"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                fullWidth
                size="small"
                disabled={isSavingCategory}
                required
              />
              <TextField
                label="الوصف"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                multiline
                rows={2}
                fullWidth
                size="small"
                disabled={isSavingCategory}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={isSavingCategory}
              color="inherit"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSavingCategory}
              startIcon={
                isSavingCategory ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              إنشاء
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
};

export default ExpenseFormModal;
