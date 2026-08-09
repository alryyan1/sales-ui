// src/components/admin/expenses/ExpenseFormModal.tsx
import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { AlertCircle, Loader2, Plus } from "lucide-react";

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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import expenseCategoryService, { ExpenseCategory } from "@/services/ExpenseCategoryService";
import expenseService, { Expense, ExpenseFormData } from "@/services/expenseService";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit: Expense | null;
  onSaveSuccess: (expense: Expense) => void;
  shiftId?: number | null;
}

type ExpenseFormFields = {
  title: string;
  amount: string;
  payment_method: string;
  expense_category_id: string;
};

const PAYMENT_METHODS = [
  { value: "cash", label: "نقدي" },
  { value: "bankak", label: "بنكك" },
  { value: "fawry", label: "فوري" },
  { value: "ocash", label: "أوكاش" },
];

const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  expenseToEdit,
  onSaveSuccess,
  shiftId,
}) => {
  const isEditMode = Boolean(expenseToEdit);
  const [serverError, setServerError] = useState<string | null>(null);

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

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const fetchCategories = useCallback(async () => {
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
    if (isOpen) fetchCategories();
  }, [isOpen, fetchCategories]);

  useEffect(() => {
    if (!isOpen) return;
    setServerError(null);
    if (isEditMode && expenseToEdit) {
      reset({
        title: expenseToEdit.title ?? "",
        amount: String(expenseToEdit.amount ?? ""),
        payment_method: expenseToEdit.payment_method ?? "cash",
        expense_category_id: expenseToEdit.expense_category_id
          ? String(expenseToEdit.expense_category_id)
          : "",
      });
    } else {
      reset({ title: "", amount: "", payment_method: "cash", expense_category_id: "" });
    }
  }, [isOpen, isEditMode, expenseToEdit, reset]);

  const onSubmit = async (data: ExpenseFormFields) => {
    setServerError(null);
    const payload: ExpenseFormData = {
      title: data.title,
      amount: Number(data.amount),
      expense_date:
        isEditMode && expenseToEdit?.expense_date ? expenseToEdit.expense_date : getToday(),
      expense_category_id: data.expense_category_id ? Number(data.expense_category_id) : null,
      payment_method: data.payment_method || null,
      reference: null,
      description: null,
      shift_id: shiftId ?? null,
    };
    try {
      const saved =
        isEditMode && expenseToEdit
          ? await expenseService.updateExpense(expenseToEdit.id, payload)
          : await expenseService.createExpense(payload);
      onSaveSuccess(saved);
      onClose();
    } catch (err) {
      setServerError(expenseService.getErrorMessage(err));
      const apiErrors = expenseService.getValidationErrors(err);
      if (apiErrors) {
        (Object.entries(apiErrors) as [keyof ExpenseFormFields, string[]][]).forEach(
          ([field, messages]) => {
            setError(field, { type: "server", message: messages[0] });
          }
        );
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsAddingCategory(true);
    try {
      const newCat = await expenseCategoryService.createCategory({ name: newCategoryName });
      await fetchCategories();
      setIsAddCategoryOpen(false);
      setNewCategoryName("");
      reset((prev) => ({ ...prev, expense_category_id: String(newCat.id) }));
    } catch (err) {
      console.error("Failed to add category", err);
    } finally {
      setIsAddingCategory(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent dir="rtl" className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "تعديل المصروف" : "إضافة مصروف"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "حدّث تفاصيل هذا المصروف."
                : "سجّل مصروفًا جديدًا وحدد القسم وطريقة الدفع."}
            </DialogDescription>
          </DialogHeader>

          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>تعذر الحفظ</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="expense-title">اسم المصروف</Label>
              <Controller
                control={control}
                name="title"
                rules={{ required: "اسم المصروف مطلوب" }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="expense-title"
                      placeholder="مثال: صيانة مكيف"
                      autoFocus
                      disabled={isSubmitting}
                      aria-invalid={!!fieldState.error}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">المبلغ</Label>
              <Controller
                control={control}
                name="amount"
                rules={{ required: "المبلغ مطلوب" }}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      id="expense-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isSubmitting}
                      aria-invalid={!!fieldState.error}
                      onFocus={(e) => e.target.select()}
                      {...field}
                    />
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-category">القسم</Label>
              <div className="flex items-center gap-2">
                <Controller
                  control={control}
                  name="expense_category_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting || isLoadingCategories}
                    >
                      <SelectTrigger id="expense-category" className="flex-1">
                        <SelectValue placeholder="بدون قسم" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={isSubmitting}
                      onClick={() => setIsAddCategoryOpen(true)}
                    >
                      <Plus className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>إضافة قسم جديد</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expense-payment-method">طريقة الدفع</Label>
              <Controller
                control={control}
                name="payment_method"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
                    <SelectTrigger id="expense-payment-method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((pm) => (
                        <SelectItem key={pm.value} value={pm.value}>
                          {pm.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-24 gap-2">
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEditMode ? "تحديث" : "حفظ"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* Quick add category */}
      <Dialog
        open={isAddCategoryOpen}
        onOpenChange={(open) => {
          if (!open && !isAddingCategory) setIsAddCategoryOpen(false);
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة قسم جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-category-name">اسم القسم</Label>
            <Input
              id="new-category-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              autoFocus
              disabled={isAddingCategory}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCategory();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isAddingCategory}
              onClick={() => setIsAddCategoryOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={isAddingCategory || !newCategoryName.trim()}
              onClick={handleAddCategory}
              className="gap-2"
            >
              {isAddingCategory && <Loader2 className="size-4 animate-spin" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default ExpenseFormModal;
