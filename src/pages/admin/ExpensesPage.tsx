// src/pages/admin/ExpensesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  AlertCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { getPageNumbers } from "@/lib/pagination";

import expenseService, { Expense } from "@/services/expenseService";
import expenseCategoryService, { ExpenseCategory } from "@/services/ExpenseCategoryService";
import ExpenseFormModal from "@/components/admin/expenses/ExpenseFormModal";

const PER_PAGE = 10;

const ExpensesPage: React.FC = () => {
  const { t } = useTranslation("expenses");
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();

  const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: t("paymentCash"),
    bankak: t("paymentBankak"),
    fawry: t("paymentFawry"),
    ocash: t("paymentOcash"),
    bank_transfer: t("paymentBankTransfer"),
    card: t("paymentCard"),
  };

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedCategory, dateFrom, dateTo]);

  const categoriesQuery = useQuery({
    queryKey: ["expense-categories-flat"],
    queryFn: () =>
      expenseCategoryService.getCategories(1, 999, "", true) as Promise<ExpenseCategory[]>,
    staleTime: 5 * 60 * 1000,
  });

  const expensesQuery = useQuery({
    queryKey: ["admin-expenses", page, debouncedSearch, selectedCategory, dateFrom, dateTo],
    queryFn: () =>
      expenseService.getExpenses(page, PER_PAGE, {
        search: debouncedSearch || undefined,
        expense_category_id: selectedCategory !== "all" ? Number(selectedCategory) : undefined,
        date_from: dateFrom,
        date_to: dateTo,
        sort_by: "expense_date",
        sort_direction: "desc",
      }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => expenseService.deleteExpense(id),
    onSuccess: () => {
      toast.success(t("deleteSuccessToast"));
      const isLastRowOnPage = expensesQuery.data?.data.length === 1 && page > 1;
      setExpenseToDelete(null);
      if (isLastRowOnPage) {
        setPage((p) => p - 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      }
    },
    onError: (err) => {
      toast.error(t("deleteErrorTitle"), { description: expenseService.getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };
  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };
  const handleSaveSuccess = () => {
    const wasEdit = Boolean(editingExpense);
    closeModal();
    queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
    queryClient.invalidateQueries({ queryKey: ["expense-categories-flat"] });
    toast.success(wasEdit ? t("updateSuccessToast") : t("createSuccessToast"));
  };
  const confirmDelete = () => {
    if (expenseToDelete) deleteMutation.mutate(expenseToDelete.id);
  };

  const expenses = expensesQuery.data?.data ?? [];
  const pageTotal = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  const hasActiveFilters =
    debouncedSearch.trim() !== "" || selectedCategory !== "all" || !!dateRange?.from;
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setDateRange(undefined);
  };

  const isInitialLoading = expensesQuery.isLoading;
  const isEmpty = !isInitialLoading && !expensesQuery.isError && expenses.length === 0;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{t("pageTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("pageDescription")}
            </p>
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="size-4" />
            {t("add")}
          </Button>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t("search")}
              className="pr-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={t("clearSearch")}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder={t("allCategories")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("allCategories")}</SelectItem>
              {(categoriesQuery.data ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} buttonSize="default" />

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5">
              <X className="size-3.5" />
              {t("clearFilters")}
            </Button>
          )}

          {!isInitialLoading && !expensesQuery.isError && (
            <p className="ms-auto text-xs text-muted-foreground">
              {t("resultsCount", { count: expensesQuery.data?.total ?? expenses.length })}
              {expenses.length > 0 && t("pageTotal", { amount: formatCurrency(pageTotal) })}
            </p>
          )}
        </div>

        {/* Error state */}
        {expensesQuery.isError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="size-4" />
            <AlertTitle>{t("loadFailed")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{expenseService.getErrorMessage(expensesQuery.error)}</span>
              <Button size="sm" variant="outline" onClick={() => expensesQuery.refetch()}>
                {t("retryButton")}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading skeleton */}
        {isInitialLoading && (
          <div className="space-y-2 rounded-xl border p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-auto h-8 w-8 rounded-md" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
            <Receipt className="size-10 text-muted-foreground" />
            {hasActiveFilters ? (
              <div>
                <p className="font-medium text-foreground">{t("noFilterResultsTitle")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("noFilterResultsHint")}
                </p>
                <Button variant="link" size="sm" onClick={clearFilters}>
                  {t("clearFilters")}
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-medium text-foreground">{t("noResults")}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("noExpensesYetHint")}
                </p>
              </div>
            )}
            {!hasActiveFilters && (
              <Button onClick={openCreateModal} className="mt-2 gap-2">
                <Plus className="size-4" />
                {t("addFirstExpense")}
              </Button>
            )}
          </div>
        )}

        {/* Table */}
        {!isInitialLoading && !expensesQuery.isError && !isEmpty && (
          <>
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start">{t("date")}</TableHead>
                    <TableHead className="text-start">{t("title")}</TableHead>
                    <TableHead className="text-start">{t("category")}</TableHead>
                    <TableHead className="text-start">{t("paymentMethod")}</TableHead>
                    <TableHead className="text-end">{t("amount")}</TableHead>
                    <TableHead className="w-12">
                      <span className="sr-only">{t("actions")}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="py-3 text-sm text-muted-foreground">
                        {expense.expense_date}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{expense.title}</span>
                        {expense.reference && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {expense.reference}
                          </span>
                        )}
                        {expense.description && (
                          <span className="mt-0.5 block max-w-xs truncate text-xs text-muted-foreground" title={expense.description}>
                            {expense.description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {expense.expense_category_name ? (
                          <Badge variant="secondary">{expense.expense_category_name}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">{t("dash")}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {expense.payment_method
                          ? PAYMENT_METHOD_LABELS[expense.payment_method] ?? expense.payment_method
                          : t("dash")}
                      </TableCell>
                      <TableCell className="text-end font-semibold text-foreground">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">{t("actions")}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onSelect={() => openEditModal(expense)}>
                                <Pencil className="size-4" />
                                {t("edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setExpenseToDelete(expense)}
                              >
                                <Trash2 className="size-4" />
                                {t("delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {expensesQuery.data && expensesQuery.data.last_page > 1 && (
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1 && !expensesQuery.isFetching) setPage((p) => p - 1);
                      }}
                      className={
                        page <= 1 || expensesQuery.isFetching
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                  {getPageNumbers(page, expensesQuery.data.last_page).map((p, i) =>
                    p === "ellipsis" ? (
                      <PaginationItem key={`e-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink
                          href="#"
                          isActive={p === page}
                          onClick={(e) => {
                            e.preventDefault();
                            if (!expensesQuery.isFetching) setPage(p);
                          }}
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (
                          expensesQuery.data &&
                          page < expensesQuery.data.last_page &&
                          !expensesQuery.isFetching
                        ) {
                          setPage((p) => p + 1);
                        }
                      }}
                      className={
                        (expensesQuery.data && page >= expensesQuery.data.last_page) ||
                        expensesQuery.isFetching
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>

      {/* Create / edit expense */}
      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        expenseToEdit={editingExpense}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!expenseToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setExpenseToDelete(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("confirmDeleteTitle", { title: expenseToDelete?.title })}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("actionCannotBeUndone")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setExpenseToDelete(null)}
            >
              {t("cancelButton")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("deletePermanently")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExpensesPage;
