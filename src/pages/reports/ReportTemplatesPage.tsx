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
import { useTranslation } from "react-i18next";

const ReportTemplatesPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const DEFAULT_CONTENT = `${t("reports:reportTemplatesPage.defaultContentDatePrefix")}{{date}}

${t("reports:reportTemplatesPage.defaultContentGreeting")}

${t("reports:reportTemplatesPage.defaultContentSubjectLabel")}

${t("reports:reportTemplatesPage.defaultContentBody")}`;
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
      toast.error(t("reports:reportTemplatesPage.loadFailed"));
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
      toast.error(t("reports:reportTemplatesPage.nameAndContentRequired"));
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
        toast.success(t("reports:reportTemplatesPage.updateSuccess"));
      } else {
        const created = await reportTemplateService.create({
        name: formState.name,
        content: formState.content,
        footer_text: formState.footerText,
      });
        setTemplates((prev) => [created, ...prev]);
        toast.success(t("reports:reportTemplatesPage.createSuccess"));
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(t("reports:reportTemplatesPage.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: ReportTemplate) => {
    if (!window.confirm(t("reports:reportTemplatesPage.confirmDelete"))) {
      return;
    }
    try {
      await reportTemplateService.remove(template.id);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      toast.success(t("reports:reportTemplatesPage.deleteSuccess"));
    } catch (error) {
      toast.error(t("reports:reportTemplatesPage.deleteFailed"));
    }
  };

  const handlePrintTemplate = async (template: ReportTemplate) => {
    try {
      await reportTemplateService.downloadPdf(template.id, dateValue);
    } catch (error) {
      toast.error(t("reports:reportTemplatesPage.printFailed"));
    }
  };

  return (
    <Stack spacing={3} dir={i18n.dir()}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {t("reports:reportTemplatesPage.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("reports:reportTemplatesPage.subtitle")}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          {t("reports:reportTemplatesPage.createNewButton")}
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField
              label={t("reports:reportTemplatesPage.printDateLabel")}
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
              <Typography color="text.secondary">{t("reports:reportTemplatesPage.noTemplatesSaved")}</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("reports:reportTemplatesPage.colTemplateName")}</TableCell>
                    <TableCell>{t("reports:reportTemplatesPage.colLastModified")}</TableCell>
                    <TableCell align="center">{t("reports:reportTemplatesPage.colActions")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{new Date(template.updated_at).toLocaleDateString(i18n.language === "ar" ? "ar-SA" : "en-US")}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title={t("reports:reportTemplatesPage.editTemplateTooltip")}>
                            <IconButton size="small" onClick={() => openEditDialog(template)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("reports:reportTemplatesPage.printPdfTooltip")}>
                            <IconButton size="small" onClick={() => handlePrintTemplate(template)}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("reports:reportTemplatesPage.deleteTemplateTooltip")}>
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
        <DialogTitle>{isEditMode ? t("reports:reportTemplatesPage.editTemplateTitle") : t("reports:reportTemplatesPage.createTemplateTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label={t("reports:reportTemplatesPage.templateNameLabel")}
              value={formState.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              fullWidth
            />
            <TextField
              label={t("reports:reportTemplatesPage.reportContentLabel")}
              value={formState.content}
              onChange={(e) => handleFormChange("content", e.target.value)}
              fullWidth
              multiline
              minRows={10}
            />
            <TextField
              label={t("reports:reportTemplatesPage.footerTextLabel")}
              value={formState.footerText}
              onChange={(e) => handleFormChange("footerText", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText={t("reports:reportTemplatesPage.footerTextHelper")}
            />
            <Typography color="text.secondary" variant="body2">
              {t("reports:reportTemplatesPage.placeholderHintBefore")} <code>{"{{date}}"}</code> {t("reports:reportTemplatesPage.placeholderHintAfter")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{t("common:cancel")}</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={saving}>
            {t("reports:reportTemplatesPage.saveButton")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ReportTemplatesPage;
