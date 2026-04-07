import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Paper,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Print as PrintIcon,
} from "@mui/icons-material";
import { toast } from "sonner";
import reportTemplateService, { ReportTemplate } from "@/services/reportTemplateService";

const DEFAULT_CONTENT = `التاريخ: {{date}}

السيد / السيدة:

الموضوع: 

نحيطكم علماً بأنه...`;

const ReportTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [dateValue, setDateValue] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [formState, setFormState] = useState({ name: "", content: DEFAULT_CONTENT, footerText: "" });

  const isEditMode = useMemo(() => selectedTemplate !== null, [selectedTemplate]);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await reportTemplateService.getAll();
      setTemplates(data);
    } catch (error) {
      toast.error("فشل تحميل نماذج التقارير");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setSelectedTemplate(null);
    setFormState({ name: "", content: DEFAULT_CONTENT, footerText: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFormState({ name: template.name, content: template.content, footerText: template.footer_text ?? "" });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleFormChange = (field: "name" | "content" | "footerText", value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveTemplate = async () => {
    if (!formState.name.trim() || !formState.content.trim()) {
      toast.error("يرجى إدخال اسم المحتوى والنص.");
      return;
    }

    setSaving(true);
    try {
      if (selectedTemplate) {
        const updated = await reportTemplateService.update(selectedTemplate.id, {
        name: formState.name,
        content: formState.content,
        footer_text: formState.footerText,
      });
        setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        toast.success("تم تحديث النموذج بنجاح");
      } else {
        const created = await reportTemplateService.create({
        name: formState.name,
        content: formState.content,
        footer_text: formState.footerText,
      });
        setTemplates((prev) => [created, ...prev]);
        toast.success("تم إنشاء النموذج بنجاح");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error("فشل حفظ النموذج");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: ReportTemplate) => {
    if (!window.confirm("هل متأكد من حذف هذا النموذج؟")) {
      return;
    }
    try {
      await reportTemplateService.remove(template.id);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      toast.success("تم حذف النموذج");
    } catch (error) {
      toast.error("فشل حذف النموذج");
    }
  };

  const handlePrintTemplate = async (template: ReportTemplate) => {
    try {
      await reportTemplateService.downloadPdf(template.id, dateValue);
    } catch (error) {
      toast.error("فشل طباعة النموذج");
    }
  };

  return (
    <Stack spacing={3} dir="rtl">
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            نماذج التقارير الجاهزة
          </Typography>
          <Typography color="text.secondary">
            أنشئ نموذج تقرير جديد، حرر المحتوى، واختر التاريخ لطباعة ملف PDF.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          إنشاء نموذج جديد
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField
              label="تاريخ الطباعة"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 220 }}
            />
          </Box>

          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Typography color="text.secondary">لا يوجد نماذج محفوظة بعد.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>اسم النموذج</TableCell>
                    <TableCell>آخر تعديل</TableCell>
                    <TableCell align="center">الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{new Date(template.updated_at).toLocaleDateString("ar-SA")}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="تعديل النموذج">
                            <IconButton size="small" onClick={() => openEditDialog(template)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="طباعة PDF">
                            <IconButton size="small" onClick={() => handlePrintTemplate(template)}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف النموذج">
                            <IconButton size="small" onClick={() => handleDeleteTemplate(template)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Stack>
      </Paper>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{isEditMode ? "تعديل نموذج التقرير" : "إنشاء نموذج تقرير جديد"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="اسم النموذج"
              value={formState.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              fullWidth
            />
            <TextField
              label="محتوى التقرير"
              value={formState.content}
              onChange={(e) => handleFormChange("content", e.target.value)}
              fullWidth
              multiline
              minRows={10}
            />
            <TextField
              label="نص التذييل"
              value={formState.footerText}
              onChange={(e) => handleFormChange("footerText", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText="سيظهر هذا النص في أسفل ملف PDF." 
            />
            <Typography color="text.secondary" variant="body2">
              يمكنك استخدام <code>{"{{date}}"}</code> في المحتوى لاستبدال التاريخ المحدد عند الطباعة.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={saving}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ReportTemplatesPage;
