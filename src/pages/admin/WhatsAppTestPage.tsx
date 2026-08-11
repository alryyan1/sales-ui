import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Stack,
} from "@mui/material";
import { Send, MessageSquare, LayoutTemplate } from "lucide-react";
import { useTranslation } from "react-i18next";
import apiClient from "@/lib/axios";
import { toast } from "sonner";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const WhatsAppTestPage: React.FC = () => {
  const { t } = useTranslation("whatsappTest");
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);

  // Text Message State
  const [textPhone, setTextPhone] = useState("");
  const [textMessage, setTextMessage] = useState("");

  // Template Message State
  const [templatePhone, setTemplatePhone] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [languageCode, setLanguageCode] = useState("ar");
  const [componentsJson, setComponentsJson] = useState("[]");

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSendText = async () => {
    if (!textPhone || !textMessage) {
      toast.warning(t("fillPhoneAndMessage"));
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/admin/whatsapp-cloud/send-text", {
        to: textPhone,
        text: textMessage,
      });

      if (response.data.success) {
        toast.success(t("textSentSuccess"));
        setTextMessage("");
      } else {
        toast.error(t("sendTextFailed", { error: response.data.error }));
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        t("sendTextError");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!templatePhone || !templateName) {
      toast.warning(t("fillPhoneAndTemplate"));
      return;
    }

    let parsedComponents = [];
    try {
      if (componentsJson.trim()) {
        parsedComponents = JSON.parse(componentsJson);
      }
    } catch (_e) {
      toast.error(t("invalidJson"));
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post(
        "/admin/whatsapp-cloud/send-template",
        {
          to: templatePhone,
          template_name: templateName,
          language_code: languageCode,
          components: parsedComponents,
        },
      );

      if (response.data.success) {
        toast.success(t("templateSentSuccess"));
      } else {
        toast.error(t("sendTemplateFailed", { error: response.data.error }));
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        t("sendTemplateError");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
        <MessageSquare size={32} color="#10B981" />
        <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1F2937" }}>
          {t("pageTitle")}
        </Typography>
      </Box>

      <Card elevation={0} sx={{ border: "1px solid #E5E7EB", borderRadius: 2 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="whatsapp test tabs"
          >
            <Tab
              icon={<MessageSquare size={18} style={{ marginRight: 8 }} />}
              iconPosition="start"
              label={t("textMessageTab")}
            />
            <Tab
              icon={<LayoutTemplate size={18} style={{ marginRight: 8 }} />}
              iconPosition="start"
              label={t("templateMessageTab")}
            />
          </Tabs>
        </Box>

        {/* Text Message Tab */}
        <CustomTabPanel value={tabValue} index={0}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label={t("phoneNumberLabel")}
              variant="outlined"
              value={textPhone}
              onChange={(e) => setTextPhone(e.target.value)}
              placeholder={t("phoneNumberPlaceholder")}
            />

            <TextField
              fullWidth
              label={t("messageTextLabel")}
              variant="outlined"
              multiline
              rows={4}
              value={textMessage}
              onChange={(e) => setTextMessage(e.target.value)}
            />

            <Box>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Send size={20} />
                  )
                }
                onClick={handleSendText}
                disabled={loading}
                sx={{ px: 4, py: 1.5 }}
              >
                {t("sendTextButton")}
              </Button>
            </Box>
          </Stack>
        </CustomTabPanel>

        {/* Template Message Tab */}
        <CustomTabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label={t("phoneNumberLabel")}
              variant="outlined"
              value={templatePhone}
              onChange={(e) => setTemplatePhone(e.target.value)}
              placeholder={t("phoneNumberPlaceholder")}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              <TextField
                fullWidth
                label={t("templateNameLabel")}
                variant="outlined"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t("templateNamePlaceholder")}
              />

              <TextField
                fullWidth
                label={t("languageCodeLabel")}
                variant="outlined"
                value={languageCode}
                onChange={(e) => setLanguageCode(e.target.value)}
                placeholder={t("languageCodePlaceholder")}
              />
            </Stack>

            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t("componentsInfo")}
                <br />
                <code>
                  {`[
  {
    "type": "body",
    "parameters": [
      { "type": "text", "text": "Value 1" }
    ]
  }
]`}
                </code>
              </Alert>
              <TextField
                fullWidth
                label={t("componentsLabel")}
                variant="outlined"
                multiline
                rows={6}
                value={componentsJson}
                onChange={(e) => setComponentsJson(e.target.value)}
                placeholder="[]"
                InputProps={{
                  style: { fontFamily: "monospace" },
                }}
              />
            </Box>

            <Box>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={
                  loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <Send size={20} />
                  )
                }
                onClick={handleSendTemplate}
                disabled={loading}
                sx={{ px: 4, py: 1.5 }}
              >
                {t("sendTemplateButton")}
              </Button>
            </Box>
          </Stack>
        </CustomTabPanel>
      </Card>
    </Box>
  );
};

export default WhatsAppTestPage;
