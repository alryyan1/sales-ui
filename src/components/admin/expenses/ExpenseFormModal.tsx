// src/components/admin/expenses/ExpenseFormModal.tsx
import React, { useEffect } from "react";
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
import ExpenseCategoryFormModal from "./ExpenseCategoryFormModal";

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
  payment_method: string;
  expense_category_id: number | "";
};

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
  onSaveSuccess,
  shiftId,
}) => {
  const isEditMode = Boolean(expenseToEdit);

  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    handleSubmit,
    control,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<ExpenseFormFields>({
    defaultValues: {
      title: "",
      amount: "",
      payment_method: "cash",
      expense_category_id: "",
    },
  });

  const [categories, setCategories] = React.useState<ExpenseCategory[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    try {
      const data = await expenseCategoryService.getCategories(1, 1000, "", true);
      setCategories(data as ExpenseCategory[]);
    } catch (err) {
      console.error("Failed to fetch categories", err);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (isEditMode && expenseToEdit) {
      reset({
        title: expenseToEdit.title ?? "",
        amount: String(expenseToEdit.amount ?? ""),
        payment_method: expenseToEdit.payment_method ?? "cash",
        expense_category_id: expenseToEdit.expense_category_id ?? "",
      });
    } else {
      reset({
        title: "",
        amount: "",
        payment_method: "cash",
        expense_category_id: "",
      });
    }
  }, [isOpen, isEditMode, expenseToEdit, reset]);

  const onSubmit = async (data: ExpenseFormFields) => {
    setServerError(null);
    const payload: ExpenseFormData = {
      title: data.title,
      amount: Number(data.amount),
      expense_date: isEditMode && expenseToEdit?.expense_date
        ? expenseToEdit.expense_date
        : getToday(),
      expense_category_id: data.expense_category_id === "" ? null : Number(data.expense_category_id),
      payment_method: data.payment_method === "cash" || data.payment_method === "bank" ? data.payment_method : null,
      reference: null,
      description: null,
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

  const handleCategorySaveSuccess = (newCategory: ExpenseCategory) => {
    fetchCategories();
    reset((prev) => ({
      ...prev,
      expense_category_id: newCategory.id,
    }));
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
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

        <DialogContent sx={{ mt: 2,pb:2,mb:2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2,p:2,mb:2 }}>
            {serverError && <Alert severity="error">{serverError}</Alert>}

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
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Controller
                name="expense_category_id"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl
                    fullWidth
                    size="small"
                    error={!!fieldState.error}
                  >
                    <InputLabel>القسم / التصنيف</InputLabel>
                    <Select
                      {...field}
                      label="القسم / التصنيف"
                      fullWidth
                      disabled={isSubmitting}
                    >
                      <MenuItem value="">
                        <em>بدون قسم</em>
                      </MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
              <IconButton
                size="small"
                color="primary"
                onClick={() => setIsCategoryModalOpen(true)}
                sx={{ mt: 0.5 }}
                title="إضافة قسم جديد"
              >
                <Plus size={20} />
              </IconButton>
            </Box>
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
                    <MenuItem value="cash">نقدي</MenuItem>
                    <MenuItem value="bank">بنك</MenuItem>
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error">
                      {fieldState.error.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />
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

      <ExpenseCategoryFormModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSaveSuccess={handleCategorySaveSuccess}
      />
    </Dialog>
  );
};

export default ExpenseFormModal;
