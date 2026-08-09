import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Switch,
  TextField,
  Stack,
  alpha,
  useTheme,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface PosSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const PosSettings = ({ control }: PosSettingsProps) => {
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
          {t("settings:posSettingsSectionTitle")}
        </Typography>
        {/* Product Visibility Settings */}
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t("settings:productVisibilitySectionTitle")}
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="pos_show_out_of_stock_products"
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
                          {t("settings:showOutOfStockProductsLabel")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t("settings:showOutOfStockProductsDesc")}
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
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t("settings:whatsappNotificationsSectionTitle")}
            </Typography>
            <Controller
              name="whatsapp_shift_closure_numbers"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || ""}
                  label={t("settings:shiftClosureNumbersLabel")}
                  placeholder={t("settings:shiftClosureNumbersPlaceholder")}
                  helperText={t("settings:shiftClosureNumbersHelper")}
                  fullWidth
                  variant="outlined"
                  dir="ltr"
                />
              )}
            />
          </FormControl>
        </Box>
        <Box
          sx={{
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            p: 3,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            mt: 3,
          }}
        >
          <FormControl component="fieldset" sx={{ width: "100%" }}>
            <Typography
              variant="subtitle1"
              fontWeight={600}
              gutterBottom
              sx={{ mb: 2 }}
            >
              {t("settings:firebaseSettingsSectionTitle")}
            </Typography>
            <Controller
              name="firebase_collection_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  value={field.value || "none"}
                  label={t("settings:firebaseCollectionNameLabel")}
                  placeholder={t("settings:firebaseCollectionNamePlaceholder")}
                  helperText={t("settings:firebaseCollectionNameHelper")}
                  fullWidth
                  variant="outlined"
                  dir="ltr"
                />
              )}
            />
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
};
