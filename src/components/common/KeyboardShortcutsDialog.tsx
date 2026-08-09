import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  useTheme,
  Chip,
  Stack,
} from "@mui/material";
import { X, Keyboard } from "lucide-react";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
  category?: string;
}

const shortcuts: Shortcut[] = [
  {
    keys: ["/"],
    description: "التركيز على مربع بحث المنتجات / الباركود",
    category: "نقطة البيع",
  },
  {
    keys: ["F4"],
    description: "اختيار العميل",
    category: "نقطة البيع",
  },
  {
    keys: ["F8"],
    description: "فتح نافذة الدفع",
    category: "نقطة البيع",
  },
  {
    keys: ["F10"],
    description: "دفع سريع نقدًا بكامل المبلغ",
    category: "نقطة البيع",
  },
  {
    keys: ["Delete"],
    description: "حذف الصنف المحدد من السلة",
    category: "نقطة البيع",
  },
  {
    keys: ["+", "-"],
    description: "زيادة أو إنقاص كمية الصنف المحدد",
    category: "نقطة البيع",
  },
  {
    keys: ["Esc"],
    description: "إغلاق النافذة الحالية / إلغاء تحديد الصنف",
    category: "نقطة البيع",
  },
  {
    keys: ["+"],
    description: "فتح نافذة الدفع / إنشاء عملية بيع جديدة",
    category: "المعرض (الكلاسيكية)",
  },
  {
    keys: ["Ctrl", "N"],
    description: "إنشاء عملية بيع جديدة",
    category: "المعرض (الكلاسيكية)",
  },
  {
    keys: ["Ctrl", "S"],
    description: "حفظ المسودة",
    category: "المعرض (الكلاسيكية)",
  },
];

export const KeyboardShortcutsDialog: React.FC<KeyboardShortcutsDialogProps> = ({
  open,
  onClose,
}) => {
  const theme = useTheme();

  const formatKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      Ctrl: "Ctrl",
      Cmd: "⌘",
      Shift: "Shift",
      Alt: "Alt",
      Enter: "Enter",
      Esc: "Esc",
      "+": "+",
      "-": "-",
    };
    return keyMap[key] || key;
  };

  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || "عام";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Keyboard size={24} />
          <Typography variant="h6" component="span">
            اختصارات لوحة المفاتيح
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          size="small"
          sx={{ minWidth: "auto", p: 0.5 }}
        >
          <X size={20} />
        </Button>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={3}>
          {Object.entries(groupedShortcuts).map(([category, items]) => (
            <Box key={category}>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  letterSpacing: 1,
                }}
              >
                {category}
              </Typography>
              <Stack spacing={1.5}>
                {items.map((shortcut, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: theme.palette.mode === "dark" 
                        ? "rgba(255, 255, 255, 0.05)" 
                        : "rgba(0, 0, 0, 0.02)",
                      "&:hover": {
                        bgcolor: theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(0, 0, 0, 0.04)",
                      },
                      transition: "background-color 0.2s",
                    }}
                  >
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {shortcut.description}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <Chip
                            label={formatKey(key)}
                            size="small"
                            sx={{
                              height: 24,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              bgcolor: theme.palette.mode === "dark"
                                ? "rgba(255, 255, 255, 0.12)"
                                : "rgba(0, 0, 0, 0.08)",
                              color: "text.primary",
                              border: `1px solid ${
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.2)"
                                  : "rgba(0, 0, 0, 0.12)"
                              }`,
                            }}
                          />
                          {keyIndex < shortcut.keys.length - 1 && (
                            <Typography
                              variant="caption"
                              sx={{
                                mx: 0.5,
                                color: "text.secondary",
                                fontWeight: 600,
                              }}
                            >
                              +
                            </Typography>
                          )}
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                ))}
              </Stack>
              {Object.keys(groupedShortcuts).indexOf(category) <
                Object.keys(groupedShortcuts).length - 1 && (
                <Divider sx={{ mt: 2 }} />
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained" fullWidth>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};



