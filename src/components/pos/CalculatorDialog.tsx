// src/components/pos/CalculatorDialog.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

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
  TextField
} from "@mui/material";

// Icons
import { Calculator, DollarSign, Calendar, User, TrendingUp, CreditCard, Banknote, Receipt } from "lucide-react";

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
}

export const CalculatorDialog: React.FC<CalculatorDialogProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation(['pos', 'common']);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CalculatorData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
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
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchCalculatorData();
    }
  }, [open, selectedDate, selectedUser]);

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-4 w-4" />;
      case 'visa':
      case 'mastercard':
      case 'mada':
        return <CreditCard className="h-4 w-4" />;
      case 'bank_transfer':
        return <Receipt className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
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
        <Calculator style={{ height: '20px', width: '20px' }} />
        {t('pos:financialCalculator')}
      </DialogTitle>
      
      <DialogContent>
        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar style={{ height: '16px', width: '16px', color: '#6b7280' }} />
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              size="small"
              sx={{ minWidth: 150 }}
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <User style={{ height: '16px', width: '16px', color: '#6b7280' }} />
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('pos:selectUser')}</InputLabel>
              <Select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                label={t('pos:selectUser')}
              >
                <MenuItem value="all">{t('pos:allUsers')}</MenuItem>
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
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </Box>
        ) : data ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Summary Cards */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
              <Card sx={{ flex: 1 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingUp style={{ height: '16px', width: '16px' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('pos:totalIncome')}
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
                      <Receipt style={{ height: '16px', width: '16px' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('pos:totalSales')}
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

              <Card sx={{ flex: 1 }}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DollarSign style={{ height: '16px', width: '16px' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('pos:averageSale')}
                      </Typography>
                    </Box>
                  }
                  sx={{ pb: 1 }}
                />
                <CardContent>
                  <Typography variant="h4" color="secondary.main" fontWeight="bold">
                    {data.total_sales > 0 ? formatNumber(data.total_income / data.total_sales) : '0.00'}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Payment Breakdown */}
            <Card>
              <CardHeader
                title={
                  <Typography variant="h6">
                    {t('pos:paymentBreakdown')}
                  </Typography>
                }
              />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {data.payment_breakdown.map((payment, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getPaymentMethodIcon(payment.method)}
                        <Box>
                          <Typography variant="body1" fontWeight="medium" sx={{ textTransform: 'capitalize' }}>
                            {payment.method.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {payment.count} {t('pos:transactions')}
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
                      {t('pos:userBreakdown')}
                    </Typography>
                  }
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {data.user_payments.map((user, index) => (
                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <User style={{ height: '16px', width: '16px', color: '#6b7280' }} />
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {user.user_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.payment_count} {t('pos:sales')}
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