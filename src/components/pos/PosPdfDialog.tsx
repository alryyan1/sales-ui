// src/components/pos/PosPdfDialog.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import {
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  Preview as PreviewIcon,
} from "@mui/icons-material";

// Services
import { generateDailySalesPdf } from "../../services/exportService";
import userService from "@/services/userService";
import { useAuth } from "@/context/AuthContext";

interface PosPdfDialogProps {
  open: boolean;
  onClose: () => void;
}

type ReportType = 'daily-sales' | 'current-sale' | 'today-summary';

export const PosPdfDialog: React.FC<PosPdfDialogProps> = ({ open, onClose }) => {
  const [reportType, setReportType] = useState<ReportType>('daily-sales');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<{id:number; name:string}[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePdf = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (reportType) {
        case 'daily-sales':
          {
            const params = new URLSearchParams();
            if (selectedDate) params.append('date', selectedDate);
            if (selectedUserId) params.append('user_id', String(selectedUserId));
            await generateDailySalesPdf(params.toString());
          }
          break;
        case 'current-sale':
          // TODO: Implement current sale PDF generation
          throw new Error('Current sale PDF generation not implemented yet');
        case 'today-summary':
          // TODO: Implement today summary PDF generation
          throw new Error('Today summary PDF generation not implemented yet');
        default:
          throw new Error('Invalid report type');
      }
      
      // Close dialog on success
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    // For now, preview is the same as generate
    // In the future, this could open a preview modal or generate a different format
    await handleGeneratePdf();
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const page1 = await userService.getUsers(1, '', '', 100);
        const minimal = (page1.data ?? page1.items ?? []).map((u:any) => ({ id: u.id, name: u.name }));
        setUsers(minimal);
        if (currentUser && (selectedUserId === '' || selectedUserId == null)) {
          setSelectedUserId(currentUser.id);
        }
      } catch (e) {
        // ignore
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [currentUser]);

  const getReportTypeLabel = (type: ReportType): string => {
    switch (type) {
      case 'daily-sales':
        return 'تقرير المبيعات اليومية';
      case 'current-sale':
        return 'تقرير البيع الحالي';
      case 'today-summary':
        return 'ملخص اليوم';
      default:
        return '';
    }
  };

  const getReportTypeDescription = (type: ReportType): string => {
    switch (type) {
      case 'daily-sales':
        return 'تقرير شامل بجميع المبيعات في تاريخ محدد';
      case 'current-sale':
        return 'تقرير عن البيع الحالي';
      case 'today-summary':
        return 'ملخص شامل لمبيعات اليوم';
      default:
        return '';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PdfIcon color="primary" />
          <Typography variant="h6">
            إنشاء تقرير PDF
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            نوع التقرير
          </Typography>
          <FormControl fullWidth>
            <InputLabel>اختر نوع التقرير</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              label="اختر نوع التقرير"
            >
              <MenuItem value="daily-sales">
                <Box>
                  <Typography variant="body1">
                    {getReportTypeLabel('daily-sales')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getReportTypeDescription('daily-sales')}
                  </Typography>
                </Box>
              </MenuItem>
              <MenuItem value="current-sale" disabled>
                <Box>
                  <Typography variant="body1">
                    {getReportTypeLabel('current-sale')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getReportTypeDescription('current-sale')}
                  </Typography>
                  <Chip 
                    label="قريباً" 
                    size="small" 
                    color="warning" 
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </MenuItem>
              <MenuItem value="today-summary" disabled>
                <Box>
                  <Typography variant="body1">
                    {getReportTypeLabel('today-summary')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getReportTypeDescription('today-summary')}
                  </Typography>
                  <Chip 
                    label="قريباً" 
                    size="small" 
                    color="warning" 
                    sx={{ mt: 0.5 }}
                  />
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {reportType === 'daily-sales' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              تاريخ التقرير
            </Typography>
            <TextField
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
            />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                اختر المستخدم
              </Typography>
              <FormControl fullWidth>
                <InputLabel>اختر المستخدم</InputLabel>
                <Select
                  label="اختر المستخدم"
                  value={selectedUserId === '' ? '' : selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                >
                  <MenuItem value="">جميع المستخدمين</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>{u.name}{currentUser?.id === u.id ? ` (أنت)` : ''}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}

        <Box sx={{ 
          p: 2, 
          bgcolor: 'grey.50', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.200'
        }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            معاينة التقرير
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reportType === 'daily-sales' && (
              <>
                سيتم إنشاء تقرير المبيعات اليومية لليوم <strong>{selectedDate}</strong>
              </>
            )}
            {reportType === 'current-sale' && 'سيتم إنشاء تقرير عن البيع الحالي'}
            {reportType === 'today-summary' && 'سيتم إنشاء ملخص شامل لمبيعات اليوم'}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
        >
          إلغاء
        </Button>
        
        <Button
          onClick={handlePreview}
          variant="outlined"
          startIcon={<PreviewIcon />}
          disabled={loading || reportType === 'current-sale' || reportType === 'today-summary'}
        >
          معاينة
        </Button>
        
        <Button
          onClick={handleGeneratePdf}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <PdfIcon />}
          disabled={loading || reportType === 'current-sale' || reportType === 'today-summary'}
        >
          {loading ? 'جاري الإنشاء...' : 'إنشاء PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 