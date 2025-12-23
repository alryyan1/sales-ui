// src/components/admin/expenses/ExpenseFormModal.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';

import expenseService, { Expense, ExpenseFormData } from '@/services/expenseService';
import expenseCategoryService, { ExpenseCategory } from '@/services/ExpenseCategoryService';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenseToEdit: Expense | null;
  onSaveSuccess: (expense: Expense) => void;
}

const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({ isOpen, onClose, expenseToEdit, onSaveSuccess }) => {
  const isEditMode = Boolean(expenseToEdit);

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [categoryServerError, setCategoryServerError] = useState<string | null>(null);

  const form = useForm<ExpenseFormFields>({
    defaultValues: {
      title: '',
      amount: '' as unknown as number | string,
      expense_date: '',
      expense_category_id: '' as unknown as string,
      payment_method: '' as unknown as string,
      reference: '' as unknown as string,
      description: '' as unknown as string,
    },
  });

  const { handleSubmit, control, reset, formState: { isSubmitting } } = form;

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const data = await expenseCategoryService.getCategories(1, 9999, '', true);
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
        title: expenseToEdit.title ?? '',
        amount: String(expenseToEdit.amount ?? ''),
        expense_date: expenseToEdit.expense_date ?? '',
        expense_category_id: expenseToEdit.expense_category_id ? String(expenseToEdit.expense_category_id) : '',
        payment_method: expenseToEdit.payment_method ?? '',
        reference: expenseToEdit.reference ?? '',
        description: expenseToEdit.description ?? '',
      });
    } else {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      reset({
        title: '',
        amount: '',
        expense_date: `${yyyy}-${mm}-${dd}`,
        expense_category_id: '',
        payment_method: '',
        reference: '',
        description: '',
      });
    }
  }, [isOpen, isEditMode, expenseToEdit, reset, fetchCategories]);

  type ExpenseFormFields = {
    title: string;
    amount: string | number;
    expense_date: string;
    expense_category_id: string;
    payment_method?: string;
    reference?: string;
    description?: string;
  };

  const onSubmit = async (data: ExpenseFormFields) => {
    setServerError(null);
    const payload: ExpenseFormData = {
      title: data.title,
      amount: Number(data.amount),
      expense_date: data.expense_date,
      expense_category_id: data.expense_category_id ? Number(data.expense_category_id) : null,
      payment_method: data.payment_method ? data.payment_method : null,
      reference: data.reference ? data.reference : null,
      description: data.description ? data.description : null,
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
        (Object.entries(apiErrors) as [keyof ExpenseFormFields, string[]][]).forEach(([field, messages]) => {
          form.setError(field as keyof ExpenseFormFields, { type: 'server', message: (messages as string[])[0] });
        });
      }
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryServerError(null);
    if (!newCategoryName.trim()) {
      setCategoryServerError('الاسم مطلوب');
      return;
    }
    setIsSavingCategory(true);
    try {
      const saved = await expenseCategoryService.createCategory({ name: newCategoryName.trim(), description: newCategoryDescription.trim() || null });
      setCategories((prev) => [saved as ExpenseCategory, ...prev]);
      form.setValue('expense_category_id', String((saved as ExpenseCategory).id));
      setIsCategoryModalOpen(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (error) {
      setCategoryServerError(expenseCategoryService.getErrorMessage(error));
    } finally {
      setIsSavingCategory(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0">
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <DialogHeader className="p-6 pb-4 border-b dark:border-gray-700">
              <DialogTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {isEditMode ? 'تعديل المصروف' : 'إضافة مصروف'}
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {serverError && (
                <div className="text-red-600 text-sm">{serverError}</div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="title"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>العنوان</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل عنوان المصروف" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="amount"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>المبلغ</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" onFocus={(e) => e.currentTarget.select()} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="expense_date"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>التاريخ</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="expense_category_id"
                  render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>الفئة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || loadingCategories}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingCategories ? 'جاري التحميل...' : 'اختر الفئة'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value=" ">لا توجد فئة</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                    <div className="mt-2">
                      <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={() => setIsCategoryModalOpen(true)}>
                        <Plus className="size-4" /> إضافة فئة
                      </Button>
                    </div>
                  </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="payment_method"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>طريقة الدفع</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل طريقة الدفع" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="reference"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>المرجع</FormLabel>
                      <FormControl>
                        <Input placeholder="أدخل رقم المرجع" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="description"
                  render={({ field, fieldState }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>الوصف</FormLabel>
                      <FormControl>
                        <Textarea rows={4} placeholder="أدخل وصف المصروف" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter className="p-6 pt-4 border-t dark:border-gray-700">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isSubmitting}>إلغاء</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (<Loader2 className="me-2 h-4 w-4 animate-spin" />)}
                {isEditMode ? 'تحديث' : 'إنشاء'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleCreateCategory} noValidate>
          <DialogHeader>
            <DialogTitle>إضافة فئة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {categoryServerError && (
              <div className="text-red-600 text-sm">{categoryServerError}</div>
            )}
            <div>
              <div className="mb-1 text-sm font-medium">الاسم</div>
              <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="مثال: المرافق" />
            </div>
            <div>
              <div className="mb-1 text-sm font-medium">الوصف</div>
              <Textarea rows={3} value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} placeholder="أدخل وصف الفئة" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isSavingCategory}>إلغاء</Button>
            </DialogClose>
            <Button type="submit" disabled={isSavingCategory}>
              {isSavingCategory && (<Loader2 className="me-2 h-4 w-4 animate-spin" />)}
              إنشاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ExpenseFormModal;


