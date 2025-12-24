// src/pages/admin/ExpensesPage.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";

// MUI Components
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  SelectChangeEvent,
  InputLabel,
  FormControl,
  Alert,
  CircularProgress,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  IconButton,
  Tooltip,
  Grid,
} from "@mui/material";
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

// Services
import expenseService, { Expense } from "@/services/expenseService";
import expenseCategoryService, {
  ExpenseCategory,
} from "@/services/ExpenseCategoryService";
import ExpenseFormModal from "@/components/admin/expenses/ExpenseFormModal";

type PaginatedResponse<T> =
  import("@/services/clientService").PaginatedResponse<T>;

type ExpenseTableItem = Expense;

const ExpensesPage: React.FC = () => {
  // Removed useTranslation

  const [response, setResponse] =
    useState<PaginatedResponse<ExpenseTableItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseTableItem | null>(
    null
  );

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await expenseCategoryService.getCategories(
        1,
        9999,
        "",
        true
      );
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
        sort_by: "expense_date",
        sort_direction: "desc",
      });
      setResponse(data);
    } catch (err) {
      setError(expenseService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory, dateFrom, dateTo]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);
  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleCategoryChange = (event: SelectChangeEvent<number | "">) => {
    const val = event.target.value as number | "";
    setSelectedCategory(val === "" ? null : Number(val));
    setCurrentPage(1);
  };

  const openCreateModal = () => {
    setEditingExpense(null);
    setIsModalOpen(true);
  };
  const openEditModal = (expense: ExpenseTableItem) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);
  const handleSaveSuccess = () => {
    closeModal();
    setCurrentPage(1);
    fetchExpenses();
  };
  const handleDelete = async (expense: ExpenseTableItem) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المصروفات؟")) return;
    try {
      await expenseService.deleteExpense(expense.id);
      fetchExpenses();
    } catch {
      /* show snackbar later */
    }
  };

  return (
    <Box
      sx={{
        height: "calc(100vh - 100px)",
        width: "100%",
        p: 2,
        direction: "rtl",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          المصروفات
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateModal}
        >
          إضافة مصروف
        </Button>
      </Stack>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6} lg={3}>
          <TextField
            fullWidth
            size="small"
            placeholder="بحث..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <FormControl size="small" fullWidth>
            <InputLabel>القسم</InputLabel>
            <Select
              label="القسم"
              value={selectedCategory ?? ""}
              onChange={handleCategoryChange}
            >
              <MenuItem value="">
                <em>كل الأقسام</em>
              </MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <TextField
            type="date"
            size="small"
            fullWidth
            label="من تاريخ"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <TextField
            type="date"
            size="small"
            fullWidth
            label="إلى تاريخ"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
          />
        </Grid>
      </Grid>

      {isLoading && (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={20} />
          <Typography variant="body2" color="text.secondary">
            جاري التحميل...
          </Typography>
        </Stack>
      )}

      {!isLoading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!isLoading && !error && response && (
        <>
          <TableContainer component={Paper} sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell align="right">المبلغ</TableCell>
                  <TableCell>المرجع</TableCell>
                  <TableCell align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {response.data.map((exp) => (
                  <TableRow key={exp.id} hover>
                    <TableCell>{exp.id}</TableCell>
                    <TableCell>{exp.expense_date}</TableCell>
                    <TableCell>{exp.title}</TableCell>
                    <TableCell>{exp.expense_category_name || "—"}</TableCell>
                    <TableCell align="right">
                      {Number(exp.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>{exp.reference || "—"}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openEditModal(exp)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(exp)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {response.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography variant="body2" color="text.secondary">
                        لا توجد نتائج
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {response.last_page > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <Pagination
                count={response.last_page}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                dir="rtl"
              />
            </Box>
          )}
        </>
      )}

      <ExpenseFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        expenseToEdit={editingExpense}
        onSaveSuccess={() => handleSaveSuccess()}
      />
    </Box>
  );
};

export default ExpensesPage;
