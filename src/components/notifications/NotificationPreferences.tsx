import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Divider,
  useTheme,
  alpha,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  AlertTriangle,
  AlertCircle,
  ShoppingCart,
  Package,
  FileText,
  Clock,
  Info,
  XCircle,
  CheckCircle,
  Settings,
} from 'lucide-react';
import { notificationPreferenceService, NotificationPreferences } from '../../services/notificationPreferenceService';
import { NotificationType } from '../../services/notificationService';
import { toast } from 'sonner';

interface NotificationPreferencesProps {
  open: boolean;
  onClose: () => void;
}

interface NotificationTypeConfig {
  type: NotificationType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const notificationTypes: NotificationTypeConfig[] = [
  {
    type: 'low_stock',
    label: 'مخزون منخفض',
    description: 'عندما ينخفض مخزون منتج عن المستوى المحدد',
    icon: <AlertTriangle size={20} color="#f59e0b" />,
    color: '#f59e0b',
  },
  {
    type: 'out_of_stock',
    label: 'نفاد المخزون',
    description: 'عندما ينفد مخزون منتج بالكامل',
    icon: <AlertCircle size={20} color="#ef4444" />,
    color: '#ef4444',
  },
  {
    type: 'new_sale',
    label: 'بيع جديد',
    description: 'عند إتمام عملية بيع جديدة',
    icon: <ShoppingCart size={20} color="#10b981" />,
    color: '#10b981',
  },
  {
    type: 'purchase_received',
    label: 'استلام مشتريات',
    description: 'عند استلام مشتريات جديدة',
    icon: <Package size={20} color="#3b82f6" />,
    color: '#3b82f6',
  },
  {
    type: 'stock_requisition',
    label: 'طلب مخزون',
    description: 'عند إنشاء أو تحديث طلب مخزون',
    icon: <FileText size={20} color="#3b82f6" />,
    color: '#3b82f6',
  },
  {
    type: 'expiry_alert',
    label: 'تنبيه انتهاء صلاحية',
    description: 'عند اقتراب انتهاء صلاحية دفعة',
    icon: <Clock size={20} color="#f59e0b" />,
    color: '#f59e0b',
  },
  {
    type: 'system',
    label: 'إشعارات النظام',
    description: 'إشعارات عامة من النظام',
    icon: <Info size={20} color="#3b82f6" />,
    color: '#3b82f6',
  },
  {
    type: 'warning',
    label: 'تحذيرات',
    description: 'تحذيرات مهمة',
    icon: <AlertTriangle size={20} color="#f59e0b" />,
    color: '#f59e0b',
  },
  {
    type: 'error',
    label: 'أخطاء',
    description: 'إشعارات الأخطاء',
    icon: <XCircle size={20} color="#ef4444" />,
    color: '#ef4444',
  },
  {
    type: 'success',
    label: 'نجاح',
    description: 'إشعارات النجاح',
    icon: <CheckCircle size={20} color="#10b981" />,
    color: '#10b981',
  },
];

export const NotificationPreferencesDialog: React.FC<NotificationPreferencesProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await notificationPreferenceService.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      toast.error('فشل تحميل التفضيلات');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (type: NotificationType) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await notificationPreferenceService.updatePreferences(preferences);
      toast.success('تم حفظ التفضيلات بنجاح');
      onClose();
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('فشل حفظ التفضيلات');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = (enabled: boolean) => {
    const newPreferences: NotificationPreferences = {};
    notificationTypes.forEach(({ type }) => {
      newPreferences[type] = enabled;
    });
    setPreferences(newPreferences);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          direction: 'rtl',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings size={24} />
          <Typography variant="h6">إعدادات الإشعارات</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                اختر أنواع الإشعارات التي تريد استلامها
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={() => handleToggleAll(true)}>
                  تفعيل الكل
                </Button>
                <Button size="small" onClick={() => handleToggleAll(false)}>
                  إلغاء الكل
                </Button>
              </Box>
            </Box>

            <Divider />

            {notificationTypes.map((config, index) => (
              <Box key={config.type}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 1,
                    bgcolor: preferences[config.type]
                      ? alpha(theme.palette.primary.main, 0.05)
                      : 'transparent',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: alpha(config.color, 0.1),
                      }}
                    >
                      {config.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {config.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.description}
                      </Typography>
                    </Box>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences[config.type] ?? true}
                        onChange={() => handleToggle(config.type)}
                        color="primary"
                      />
                    }
                    label=""
                  />
                </Box>
                {index < notificationTypes.length - 1 && <Divider sx={{ my: 1 }} />}
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>
          إلغاء
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || loading}
          startIcon={saving ? <CircularProgress size={16} /> : null}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

