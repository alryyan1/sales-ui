import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  Switch,
  Stack,
  alpha,
  useTheme,
  FormControlLabel,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface PurchaseSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PurchaseSettings = ({ control }: PurchaseSettingsProps) => {
  const { t } = useTranslation(["settings"]);
  const theme = useTheme();

  return (
    <Card
      sx={{
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        mx: "auto",
        maxWidth: 900,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Typography
          variant="h6"
          fontWeight={600}
          gutterBottom
          sx={{ mb: 4, color: "text.primary" }}
        >
          {t("settings:purchaseSettingsSectionTitle")}
        </Typography>

        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t("settings:purchaseItemFieldsSectionTitle")}
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="purchase_use_batch_number"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          {t("settings:useBatchNumberLabel")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t("settings:useBatchNumberDesc")}
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start" }}
                  />
                )}
              />
            </Stack>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
};
