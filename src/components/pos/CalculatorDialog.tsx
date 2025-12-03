// src/components/pos/CalculatorDialog.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  AlertTitle,
  Box,
  TextField,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import {
  Calculate as CalculateIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
  CreditCard as CreditCardIcon,
  AccountBalanceWallet as WalletIcon,
  Receipt as ReceiptIcon,
  AttachMoney as DollarSignIcon,
} from "@mui/icons-material";

// Services
import apiClient from "@/lib/axios";
import { formatNumber } from "@/constants";

interface PaymentBreakdown {
  method: string;
  amount: number;
  count: number;
}

interface UserPayment {
  user_id: number;
  user_name: string;
  total_amount: number;
  payment_count: number;
}

interface CalculatorData {
  total_income: number;
  total_sales: number;
  payment_breakdown: PaymentBreakdown[];
  user_payments: UserPayment[];
}

interface User {
  id: number;
  name: string;
}

interface CalculatorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: number | null;
  filterByCurrentUser?: boolean;
}

export const CalculatorDialog: React.FC<CalculatorDialogProps> = ({ 
  open, 
  onOpenChange, 
  currentUserId, 
  filterByCurrentUser = false 
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CalculatorData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<string>(
    filterByCurrentUser && currentUserId ? currentUserId.toString() : 'all'
  );
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get<{ data: User[] }>('/admin/users');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCalculatorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedUser !== 'all') {
        params.append('user_id', selectedUser);
      }

      const response = await apiClient.get<CalculatorData>(`/sales/calculator?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch calculator data:', error);
      setError('فشل تحميل البيانات المالية');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchCalculatorData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedDate, selectedUser]);

  // Update selected user when filter changes
  useEffect(() => {
    if (filterByCurrentUser && currentUserId) {
      setSelectedUser(currentUserId.toString());
    } else {
      setSelectedUser('all');
    }
  }, [filterByCurrentUser, currentUserId]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <WalletIcon sx={{ fontSize: 16 }} />;
      case 'visa':
      case 'mastercard':
      case 'mada':
        return <CreditCardIcon sx={{ fontSize: 16 }} />;
      case 'bank_transfer':
        return <ReceiptIcon sx={{ fontSize: 16 }} />;
      default:
        return <DollarSignIcon sx={{ fontSize: 16 }} />;
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={() => onOpenChange(false)}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '80vh',
          width: '40vw',
          maxWidth: '40vw'
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CalculateIcon />
        <span>الحاسبة المالية</span>
      </DialogTitle>
      
      <DialogContent>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>اختر المستخدم</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label="اختر المستخدم"
              >
                <MenuItem value="all">جميع المستخدمين</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>خطأ</AlertTitle>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : data ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Summary Cards */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Card sx={{ flex: 1 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUpIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2" color="text.secondary">
                        إجمالي الدخل
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {formatNumber(data.total_income)}
                  </Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ReceiptIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2" color="text.secondary">
                        إجمالي المبيعات
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {data.total_sales}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6">
                    تفصيل طرق الدفع
                  </Typography>
                }
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data.payment_breakdown.map((payment, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        p: 2, 
                        bgcolor: 'grey.50', 
                        borderRadius: 1 
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getPaymentMethodIcon(payment.method)}
                        <Box>
                          <Typography variant="body1" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                            {payment.method.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {payment.count} معاملة
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" fontWeight="bold">
                          {formatNumber(payment.amount)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {((payment.amount / data.total_income) * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* User Breakdown */}
            {data.user_payments.length > 0 && (
              <Card>
                <CardHeader
                  title={
                    <Typography variant="h6">
                      تفصيل المستخدمين
                    </Typography>
                  }
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.user_payments.map((user, index) => (
                      <Box 
                        key={index} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          p: 2, 
                          bgcolor: 'grey.50', 
                          borderRadius: 1 
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {user.user_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.payment_count} مبيعة
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="h6" fontWeight="bold">
                            {formatNumber(user.total_amount)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {((user.total_amount / data.total_income) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
