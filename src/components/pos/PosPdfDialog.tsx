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
  const { t } = useTranslation(['pos', 'common']);
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
        return t('pos:dailySalesReport');
      case 'current-sale':
        return t('pos:currentSaleReport');
      case 'today-summary':
        return t('pos:todaySummaryReport');
      default:
        return '';
    }
  };

  const getReportTypeDescription = (type: ReportType): string => {
    switch (type) {
      case 'daily-sales':
        return t('pos:dailySalesDescription');
      case 'current-sale':
        return t('pos:currentSaleDescription');
      case 'today-summary':
        return t('pos:todaySummaryDescription');
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
            {t('pos:generatePdfReport')}
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
            {t('pos:reportType')}
          </Typography>
          <FormControl fullWidth>
            <InputLabel>{t('pos:selectReportType')}</InputLabel>
            <Select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              label={t('pos:selectReportType')}
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
                    label={t('pos:comingSoon')} 
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
                    label={t('pos:comingSoon')} 
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
              {t('pos:reportDate')}
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
                {t('pos:selectUser', 'Select User')}
              </Typography>
              <FormControl fullWidth>
                <InputLabel>{t('pos:selectUser', 'Select User')}</InputLabel>
                <Select
                  label={t('pos:selectUser', 'Select User')}
                  value={selectedUserId === '' ? '' : selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                >
                  <MenuItem value="">{t('pos:allUsers', 'All Users')}</MenuItem>
                  {users.map(u => (
                    <MenuItem key={u.id} value={u.id}>{u.name}{currentUser?.id === u.id ? ` (${t('pos:you','You')})` : ''}</MenuItem>
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
            {t('pos:reportPreview')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {reportType === 'daily-sales' && (
              <>
                {t('pos:dailySalesPreviewText')} <strong>{selectedDate}</strong>
              </>
            )}
            {reportType === 'current-sale' && t('pos:currentSalePreviewText')}
            {reportType === 'today-summary' && t('pos:todaySummaryPreviewText')}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
        >
          {t('common:cancel')}
        </Button>
        
        <Button
          onClick={handlePreview}
          variant="outlined"
          startIcon={<PreviewIcon />}
          disabled={loading || reportType === 'current-sale' || reportType === 'today-summary'}
        >
          {t('pos:preview')}
        </Button>
        
        <Button
          onClick={handleGeneratePdf}
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <PdfIcon />}
          disabled={loading || reportType === 'current-sale' || reportType === 'today-summary'}
        >
          {loading ? t('pos:generating') : t('pos:generatePdf')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 