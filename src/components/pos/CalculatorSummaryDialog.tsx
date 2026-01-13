import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
  Grid,
  CircularProgress,
  alpha,
  useTheme,
  Button,
} from "@mui/material";
import {
  X,
  Calculator,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Plus,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import expenseService from "../../services/expenseService";
import ExpenseFormModal from "../admin/expenses/ExpenseFormModal";
import { OfflineSale } from "../../services/db";
import saleService, { Sale } from "../../services/saleService";
import { formatNumber } from "@/constants";
import { useQueryClient } from "@tanstack/react-query";
import { TextField } from "@mui/material";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";
import { useMemo } from "react";

interface CalculatorSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  sales: (OfflineSale | Sale)[];
  periodTitle: string;
  dateFrom: string;
  posMode?: "shift" | "days";
  selectedShiftId?: number | null;
}

export const CalculatorSummaryDialog: React.FC<
  CalculatorSummaryDialogProps
> = ({ open, onClose, sales: initialSales, periodTitle, dateFrom, posMode: propPosMode, selectedShiftId }) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { getSetting, isLoadingSettings } = useSettings();
  const { user, isLoading: isLoadingUser } = useAuth();
  const [localSelectedDate, setLocalSelectedDate] = React.useState(dateFrom);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);

  // Wait for settings and user to load before filtering
  const isReady = !isLoadingSettings && !isLoadingUser;
  const filterByUser = isReady 
    ? (getSetting("pos_filter_sales_by_user", false) as boolean)
    : false;
  
  // Get POS mode from prop or settings
  const posMode = propPosMode ?? (isReady ? (getSetting("pos_mode", "shift") as "shift" | "days") : "shift");
  
  // Calculate userId for filtering and query keys
  const userId = filterByUser && user?.id ? user.id : null;

  // Re-sync local date when dialog opens with a new prop date
  React.useEffect(() => {
    if (open) {
      setLocalSelectedDate(dateFrom);
      // Invalidate queries when dialog opens to force fresh data fetch
      // Include user_id and shift_id/date in query key to ensure proper cache invalidation
      const expenseQueryKey = posMode === "shift" && selectedShiftId
        ? ["expenses-summary", selectedShiftId, userId]
        : ["expenses-summary", dateFrom, userId];
      const salesQueryKey = posMode === "shift" && selectedShiftId
        ? ["synced-sales-summary", selectedShiftId, userId]
        : ["synced-sales-summary", dateFrom, userId];
      queryClient.invalidateQueries({
        queryKey: expenseQueryKey,
      });
      queryClient.invalidateQueries({
        queryKey: salesQueryKey,
      });
    }
  }, [open, dateFrom, queryClient, userId, posMode, selectedShiftId]);

  // Fetch Expenses - filter by shift_id in shift mode, by date in days mode
  // Include user_id and shift_id/date in query key for proper caching
  const expenseQueryKey = posMode === "shift" && selectedShiftId
    ? ["expenses-summary", selectedShiftId, userId]
    : ["expenses-summary", localSelectedDate, userId];
  
  const { 
    data: expensesData, 
    isLoading: isLoadingExpenses, 
    isFetching: isFetchingExpenses,
    refetch: refetchExpenses 
  } = useQuery({
    queryKey: expenseQueryKey,
    queryFn: () => {
      if (posMode === "shift" && selectedShiftId) {
        return expenseService.getExpenses(1, 1000, {
          shift_id: selectedShiftId,
        });
      } else {
        return expenseService.getExpenses(1, 1000, {
          date_from: localSelectedDate,
          date_to: localSelectedDate,
        });
      }
    },
    enabled: open && isReady && (posMode === "days" || (posMode === "shift" && selectedShiftId !== null)),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const handleExpenseSaveSuccess = () => {
    // Re-fetch expenses to update the summary
    const queryKey = posMode === "shift" && selectedShiftId
      ? ["expenses-summary", selectedShiftId, userId]
      : ["expenses-summary", localSelectedDate, userId];
    queryClient.invalidateQueries({
      queryKey,
    });
  };

  // Fetch Synced Sales - filter by shift_id in shift mode, by date in days mode
  // Include user_id and shift_id/date in query key for proper caching
  const syncedSalesQueryKey = posMode === "shift" && selectedShiftId
    ? ["synced-sales-summary", selectedShiftId, userId]
    : ["synced-sales-summary", localSelectedDate, userId];

  const { 
    data: syncedSalesData, 
    isLoading: isLoadingSynced, 
    isFetching: isFetchingSynced,
    refetch: refetchSales 
  } = useQuery({
    queryKey: syncedSalesQueryKey,
    queryFn: async () => {
      if (posMode === "shift" && selectedShiftId) {
        // In shift mode: filter by shift_id using queryParams
        const queryParams = new URLSearchParams();
        queryParams.append("shift_id", selectedShiftId.toString());
        if (filterByUser && user?.id) {
          queryParams.append("user_id", user.id.toString());
        }
        const res = await saleService.getSales(
          1,
          queryParams.toString(),
          "",
          "",
          "",
          1000,
          null, // clientId
          false, // todayOnly
          null // forCurrentUser (handled via queryParams)
        );
        return res.data;
      } else {
        // In days mode: filter by date range
        const res = await saleService.getSales(
          1,
          "",
          "",
          localSelectedDate,
          localSelectedDate,
          1000,
          null, // clientId
          false, // todayOnly
          filterByUser && user?.id ? user.id : null // forCurrentUser
        );
        return res.data;
      }
    },
    enabled: open && isReady && (posMode === "days" || (posMode === "shift" && selectedShiftId !== null)),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Refetch data when dialog opens
  React.useEffect(() => {
    if (open) {
      // Refetch both expenses and sales when dialog opens
      refetchExpenses();
      refetchSales();
    }
  }, [open, refetchExpenses, refetchSales]);

  // Invalidate and refetch when date changes (only in days mode)
  React.useEffect(() => {
    if (open && localSelectedDate && posMode === "days") {
      queryClient.invalidateQueries({
        queryKey: ["expenses-summary", localSelectedDate, userId],
      });
      queryClient.invalidateQueries({
        queryKey: ["synced-sales-summary", localSelectedDate, userId],
      });
    }
  }, [localSelectedDate, open, queryClient, userId, posMode]);

  // Show loading when initially loading OR when fetching/refetching data OR waiting for settings/user
  const isLoading = !isReady || isLoadingExpenses || isLoadingSynced || isFetchingExpenses || isFetchingSynced;

  // Determine which sales to use (strictly use synced/ID-carrying sales)
  const filterSynced = (arr: (OfflineSale | Sale)[] = []) =>
    arr.filter((s) => (s as any).is_synced || (s as Sale).id);

  // Prefer fetched synced sales data when available (even if empty array means no sales),
  // otherwise fall back to filtered initial sales
  const rawSales = syncedSalesData !== undefined
    ? syncedSalesData
    : filterSynced(initialSales);

  // Filter sales by user if setting is enabled
  const effectiveSales = useMemo(() => {
    if (!isReady || !filterByUser || !user?.id) {
      return rawSales;
    }
    return rawSales.filter((sale: any) => sale.user_id === user.id);
  }, [rawSales, filterByUser, user?.id, isReady]);

  const totalSalesAmount = (effectiveSales as any[]).reduce(
    (sum: number, sale: any) => sum + Number(sale.total_amount || 0),
    0
  );
  const totalPaidAmount = (effectiveSales as any[]).reduce(
    (sum: number, sale: any) => sum + Number(sale.paid_amount || 0),
    0
  );
  const totalSalesCount = effectiveSales.length;

  // Filter expenses by user if setting is enabled
  const rawExpenses = expensesData?.data || [];
  const expenses = useMemo(() => {
    if (!isReady || !filterByUser || !user?.id) {
      return rawExpenses;
    }
    return rawExpenses.filter((exp: any) => exp.user_id === user.id);
  }, [rawExpenses, filterByUser, user?.id, isReady]);

  const totalExpensesAmount = (expenses as any[]).reduce(
    (sum: number, exp: any) => sum + Number(exp.amount || 0),
    0
  );
  const totalExpensesCount = expenses.length;

  const netAmount = totalPaidAmount - totalExpensesAmount;

  const SummaryCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
    onAction,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
    onAction?: () => void;
  }) => (
    <Box
      sx={{
        p: 3,
        borderRadius: 4,
        bgcolor: alpha(color, 0.05),
        border: "1px solid",
        borderColor: alpha(color, 0.1),
        display: "flex",
        flexDirection: "column",
        gap: 1,
        transition: "all 0.2s ease-in-out",
        position: "relative",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 4px 12px ${alpha(color, 0.1)}`,
          borderColor: alpha(color, 0.2),
        },
      }}
    >
      {onAction && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            color: color,
            bgcolor: alpha(color, 0.1),
            "&:hover": {
              bgcolor: alpha(color, 0.2),
            },
          }}
        >
          <Plus size={16} />
        </IconButton>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" fontWeight="600" color="text.secondary">
          {title}
        </Typography>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            color: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={20} />
        </Box>
      </Box>
      <Typography variant="h5" fontWeight="800" color={color}>
        {typeof value === "number" ? formatNumber(value) : value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 5,
          boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
            }}
          >
            <Calculator size={24} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.2 }}>
              ملخص الحسابات
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {posMode === "shift" 
                ? periodTitle
                : localSelectedDate === dateFrom
                  ? periodTitle
                  : `يوم ${localSelectedDate}`}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={() => setIsExpenseModalOpen(true)}
           
          >
            إضافه مصروف
          </Button>

          <TextField
            type="date"
            size="small"
            value={localSelectedDate}
            onChange={(e) => setLocalSelectedDate(e.target.value)}
            disabled={posMode === "shift"}
            sx={{
              "& .MuiInputBase-root": {
                fontSize: "0.85rem",
                borderRadius: 2,
                bgcolor: "white",
              },
              width: 150,
            }}
          />
          <IconButton
            onClick={onClose}
            size="small"
            sx={{ color: "text.secondary" }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 4, pt: 2 }}>
        {isLoading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              جاري تحميل البيانات...
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
              mt: 1,
            }}
          >
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryCard
                  title="إجمالي المبيعات"
                  value={totalSalesAmount}
                  icon={TrendingUp}
                  color={theme.palette.primary.main}
                  subtitle={`${totalSalesCount} فاتورة مبيعات`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryCard
                  title="إجمالي المقبوضات"
                  value={totalPaidAmount}
                  icon={Wallet}
                  color={theme.palette.success.main}
                  subtitle="المبالغ التي تم استلامها"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryCard
                  title="إجمالي المنصرفات"
                  value={totalExpensesAmount}
                  icon={TrendingDown}
                  color={theme.palette.error.main}
                  subtitle={`${totalExpensesCount} بند منصرفات`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <SummaryCard
                  title="صافي الصندوق"
                  value={netAmount}
                  icon={Receipt}
                  color={
                    netAmount >= 0
                      ? theme.palette.info.main
                      : theme.palette.warning.main
                  }
                  subtitle="المقبوضات - المنصرفات"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }} />

            <Box
              sx={{
                p: 3,
                borderRadius: 4,
                bgcolor: "grey.50",
                border: "1px dashed",
                borderColor: "grey.300",
                textAlign: "center",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                fontStyle="italic"
              >
                * جميع الحسابات محسوبة بناءً على البيانات المتوفرة في هذه الفترة
                فقط.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Quick Expense Modal */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenseToEdit={null}
        onSaveSuccess={handleExpenseSaveSuccess}
        shiftId={posMode === "shift" ? selectedShiftId ?? null : null}
      />
    </Dialog>
  );
};
