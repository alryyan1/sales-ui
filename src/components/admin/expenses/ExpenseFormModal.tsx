// src/components/admin/expenses/ExpenseFormModal.tsx
import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
  Tooltip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { X, Plus } from "lucide-react";

import expenseCategoryService, {
  ExpenseCategory,
} from "@/services/ExpenseCategoryService";

import expenseService, {
  Expense,
  ExpenseFormData,
} from "@/services/expenseService";

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
  const { t } = useTranslation(["expenses"]);
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
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [isAddingCategory, setIsAddingCategory] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    setIsLoadingCategories(true);
    try {
      const data = await expenseCategoryService.getCategories(1, 999, "", true);
      setCategories(data as ExpenseCategory[]);
    } catch (err) {
      console.error("Failed to fetch expense categories", err);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, fetchCategories]);

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
      expense_category_id: data.expense_category_id === "" ? null : data.expense_category_id,
      payment_method: data.payment_method || null,
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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const newCat = await expenseCategoryService.createCategory({
        name: newCategoryName,
      });
      await fetchCategories();
      setIsAddCategoryDialogOpen(false);
      setNewCategoryName("");
      reset((prev) => ({ ...prev, expense_category_id: newCat.id }));
    } catch (err) {
      console.error("Failed to add category", err);
    } finally {
      setIsAddingCategory(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            pt: 2,
            px: 2,
            pb: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            {isEditMode ? t("expenses:editTitle") : t("expenses:addTitle")}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ px: 3, py: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ mb: 1, pb: 1, borderBottom: '1px dashed', borderColor: 'divider' }}>

            </Box>

            {serverError && <Alert severity="error">{serverError}</Alert>}

            <Controller
              name="title"
              control={control}
              rules={{ required: t("expenses:formModal.nameRequired") }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t("expenses:formModal.nameLabel")}
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
              rules={{ required: t("expenses:formModal.amountRequired") }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label={t("expenses:amount")}
                  type="number"
                  fullWidth
                  size="small"
                  onFocus={(e) => e.target.select()}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  disabled={isSubmitting}
                  inputProps={{ step: 0.001 }}
                />
              )}
            />
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Controller
                name="expense_category_id"
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl
                    fullWidth
                    size="small"
                    error={!!fieldState.error}
                  >
                    <InputLabel>{t("expenses:formModal.categoryLabel")}</InputLabel>
                    <Select
                      {...field}
                      label={t("expenses:formModal.categoryLabel")}
                      fullWidth
                      disabled={isSubmitting || isLoadingCategories}
                    >
                      <MenuItem value="">
                        <em>{t("expenses:formModal.noCategoryOption")}</em>
                      </MenuItem>
                      {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
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
              <Tooltip title={t("expenses:formModal.addCategoryTooltip")}>
                <IconButton
                  onClick={() => setIsAddCategoryDialogOpen(true)}
                  color="primary"
                  sx={{
                    bgcolor: 'primary.lighter',
                    '&:hover': { bgcolor: 'primary.light' },
                    p: 1
                  }}
                  disabled={isSubmitting}
                >
                  <Plus size={20} />
                </IconButton>
              </Tooltip>
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
                  <InputLabel>{t("expenses:paymentMethod")}</InputLabel>
                  <Select
                    {...field}
                    label={t("expenses:paymentMethod")}
                    fullWidth
                    disabled={isSubmitting}
                  >
                    <MenuItem value="cash">{t("expenses:formModal.paymentMethodCash")}</MenuItem>
                    <MenuItem value="bank_transfer">{t("expenses:formModal.paymentMethodBankTransfer")}</MenuItem>
                    <MenuItem value="visa">{t("expenses:formModal.paymentMethodVisa")}</MenuItem>
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

        {/* Quick Add Category Dialog */}
        <Dialog
          open={isAddCategoryDialogOpen}
          onClose={() => !isAddingCategory && setIsAddCategoryDialogOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle sx={{ py: 2, px: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700}>{t("expenses:formModal.addCategoryDialogTitle")}</Typography>
          </DialogTitle>
          <DialogContent sx={{ py: 2, px: 2 }}>
            <TextField
              fullWidth
              size="small"
              label={t("expenses:formModal.categoryNameLabel")}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
              sx={{ mt: 1 }}
              disabled={isAddingCategory}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button
              onClick={() => setIsAddCategoryDialogOpen(false)}
              disabled={isAddingCategory}
              color="inherit"
              size="small"
            >
              {t("expenses:formModal.cancelButton")}
            </Button>
            <Button
              onClick={handleAddCategory}
              variant="contained"
              disabled={isAddingCategory || !newCategoryName.trim()}
              size="small"
              startIcon={isAddingCategory ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {t("expenses:formModal.addButton")}
            </Button>
          </DialogActions>
        </Dialog>

        <DialogActions sx={{ px: 2, py: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={isSubmitting} color="inherit" size="small">
            {t("expenses:formModal.cancelButton")}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            size="small"
            startIcon={
              isSubmitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : null
            }
            sx={{ minWidth: 100 }}
          >
            {isEditMode ? t("expenses:formModal.updateButton") : t("expenses:formModal.saveButton")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseFormModal;
