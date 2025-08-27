// src/pages/admin/ExpensesPage.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';

// MUI (for filters)
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import MenuItem from '@mui/material/MenuItem';
import SelectMUI, { SelectChangeEvent } from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';

// Services
import expenseService, { Expense } from '@/services/expenseService';
import expenseCategoryService, { ExpenseCategory } from '@/services/ExpenseCategoryService';
import ExpenseFormModal from '@/components/admin/expenses/ExpenseFormModal';

// shadcn UI
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

type PaginatedResponse<T> = import('@/services/clientService').PaginatedResponse<T>;

type ExpenseTableItem = Expense;

const ExpensesPage: React.FC = () => {
  const { t } = useTranslation(['expenses', 'common']);

  const [response, setResponse] = useState<PaginatedResponse<ExpenseTableItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseTableItem | null>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchTerm]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await expenseCategoryService.getCategories(1, 9999, '', true);
      setCategories(data as ExpenseCategory[]);
    } catch {
      // silent
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await expenseService.getExpenses(currentPage, rowsPerPage, {
        search: debouncedSearch,
        expense_category_id: selectedCategory ?? undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: 'expense_date',
        sort_direction: 'desc',
      });
      setResponse(data);
    } catch (err) {
      setError(expenseService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory, dateFrom, dateTo]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleCategoryChange = (event: SelectChangeEvent<number | ''>) => {
    const val = event.target.value as number | '';
    setSelectedCategory(val === '' ? null : Number(val));
    setCurrentPage(1);
  };

  const openCreateModal = () => { setEditingExpense(null); setIsModalOpen(true); };
  const openEditModal = (expense: ExpenseTableItem) => { setEditingExpense(expense); setIsModalOpen(true); };
  const closeModal = () => setIsModalOpen(false);
  const handleSaveSuccess = () => { closeModal(); setCurrentPage(1); fetchExpenses(); };
  const handleDelete = async (expense: ExpenseTableItem) => {
    if (!confirm(t('expenses:confirmDelete'))) return;
    try { await expenseService.deleteExpense(expense.id); fetchExpenses(); } catch { /* show snackbar later */ }
  };

  return (
    <div className="dark:bg-gray-900 h-[calc(100vh-100px)] w-full px-2 py-2">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t('expenses:pageTitle')}</h1>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="size-4" /> {t('expenses:add')}
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 mb-2">
        <TextField
          fullWidth
          size="small"
          placeholder={t('expenses:search') || 'Search...'}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
        />
        <FormControl size="small" fullWidth>
          <InputLabel>{t('expenses:category')}</InputLabel>
          <SelectMUI
            label={t('expenses:category')}
            value={selectedCategory ?? ''}
            onChange={handleCategoryChange}
          >
            <MenuItem value=""><em>{t('expenses:allCategories')}</em></MenuItem>
            {categories.map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </SelectMUI>
        </FormControl>
        <TextField type="date" size="small" label={t('expenses:fromDate')} InputLabelProps={{ shrink: true }} value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }} />
        <TextField type="date" size="small" label={t('expenses:toDate')} InputLabelProps={{ shrink: true }} value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }} />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-4">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">{t('common:loading')}</span>
        </div>
      )}
      {!isLoading && error && (
        <Alert className="border-red-300/40 text-red-700 dark:text-red-400">{error}</Alert>
      )}

      {!isLoading && !error && response && (
        <>
          <div className="rounded-md border dark:border-gray-700 w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="dark:border-gray-700">
                  <th className="px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">{t('expenses:date')}</th>
                  <th className="px-3 py-2 text-left">{t('expenses:title')}</th>
                  <th className="px-3 py-2 text-left">{t('expenses:category')}</th>
                  <th className="px-3 py-2 text-right">{t('expenses:amount')}</th>
                  <th className="px-3 py-2 text-left">{t('expenses:reference')}</th>
                  <th className="px-3 py-2 text-center">{t('expenses:actions')}</th>
                </tr>
              </thead>
              <tbody>
                {response.data.map((exp) => (
                  <tr key={exp.id} className="border-t dark:border-gray-700">
                    <td className="px-3 py-2">{exp.id}</td>
                    <td className="px-3 py-2">{exp.expense_date}</td>
                    <td className="px-3 py-2">{exp.title}</td>
                    <td className="px-3 py-2">{exp.expense_category_name || '—'}</td>
                    <td className="px-3 py-2 text-right">{Number(exp.amount).toFixed(2)}</td>
                    <td className="px-3 py-2">{exp.reference || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(exp)}>{t('expenses:edit')}</Button>
                      <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDelete(exp)}>{t('expenses:delete')}</Button>
                    </td>
                  </tr>
                ))}
                {response.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground dark:text-gray-400">{t('expenses:noResults')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {response.last_page > 1 && (
            <div className="flex justify-center p-2">
              <UIPagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }} />
                  </PaginationItem>
                  {Array.from({ length: response.last_page }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink href="#" isActive={page === currentPage} onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(response.last_page, p + 1)); }} />
                  </PaginationItem>
                </PaginationContent>
              </UIPagination>
            </div>
          )}
        </>
      )}
      <ExpenseFormModal isOpen={isModalOpen} onClose={closeModal} expenseToEdit={editingExpense} onSaveSuccess={() => handleSaveSuccess()} />
    </div>
  );
};

export default ExpensesPage;


