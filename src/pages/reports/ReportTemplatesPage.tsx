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
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";
import reportTemplateService, { ReportTemplate } from "@/services/reportTemplateService";

const ReportTemplatesPage: React.FC = () => {
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const { direction, language } = useLanguage();
  const DEFAULT_CONTENT = t("defaultReportTemplateContent", { date: "{{date}}" });
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
      toast.error(t("failedToLoadReportTemplates"));
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
      toast.error(t("pleaseEnterNameAndContent"));
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
        toast.success(t("templateUpdatedSuccess"));
      } else {
        const created = await reportTemplateService.create({
        name: formState.name,
        content: formState.content,
        footer_text: formState.footerText,
      });
        setTemplates((prev) => [created, ...prev]);
        toast.success(t("templateCreatedSuccess"));
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(t("failedToSaveTemplate"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: ReportTemplate) => {
    if (!window.confirm(t("confirmDeleteTemplate"))) {
      return;
    }
    try {
      await reportTemplateService.remove(template.id);
      setTemplates((prev) => prev.filter((item) => item.id !== template.id));
      toast.success(t("templateDeletedSuccess"));
    } catch (error) {
      toast.error(t("failedToDeleteTemplate"));
    }
  };

  const handlePrintTemplate = async (template: ReportTemplate) => {
    try {
      await reportTemplateService.downloadPdf(template.id, dateValue);
    } catch (error) {
      toast.error(t("failedToPrintTemplate"));
    }
  };

  return (
    <Stack spacing={3} dir={direction}>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {t("reportTemplatesPageTitle")}
          </Typography>
          <Typography color="text.secondary">
            {t("reportTemplatesPageSubtitle")}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          {t("createNewTemplateButton")}
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField
              label={t("printDateLabel")}
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
              <Typography color="text.secondary">{t("noTemplatesSavedYet")}</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t("templateNameLabel")}</TableCell>
                    <TableCell>{t("lastModifiedColumn")}</TableCell>
                    <TableCell align="center">{t("actionsColumn")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id} hover>
                      <TableCell>{template.name}</TableCell>
                      <TableCell>{new Date(template.updated_at).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US")}</TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title={t("editTemplateTooltip")}>
                            <IconButton size="small" onClick={() => openEditDialog(template)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("printPdfTooltip")}>
                            <IconButton size="small" onClick={() => handlePrintTemplate(template)}>
                              <PrintIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t("deleteTemplateTooltip")}>
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
        <DialogTitle>{isEditMode ? t("editReportTemplateTitle") : t("createReportTemplateTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label={t("templateNameLabel")}
              value={formState.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              fullWidth
            />
            <TextField
              label={t("reportContentLabel")}
              value={formState.content}
              onChange={(e) => handleFormChange("content", e.target.value)}
              fullWidth
              multiline
              minRows={10}
            />
            <TextField
              label={t("footerTextLabel")}
              value={formState.footerText}
              onChange={(e) => handleFormChange("footerText", e.target.value)}
              fullWidth
              multiline
              minRows={3}
              helperText={t("footerTextHelper")}
            />
            <Typography color="text.secondary" variant="body2">
              {t("dateVariableHintPrefix")} <code>{"{{date}}"}</code> {t("dateVariableHintSuffix")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{tCommon("cancel")}</Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={saving}>
            {t("saveButton")}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default ReportTemplatesPage;
