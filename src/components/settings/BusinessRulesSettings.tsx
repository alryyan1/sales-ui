import { Controller, Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  useTheme,
} from "@mui/material";
import { AppSettings } from "@/services/settingService";

interface BusinessRulesSettingsProps {
  control: Control<Partial<AppSettings>>;
}

export const BusinessRulesSettings = ({
  control,
}: BusinessRulesSettingsProps) => {
  const { t } = useTranslation(["settings"]);
  const theme = useTheme();

  const textFieldSx = {
    "& .MuiInputBase-input": {
      direction: "ltr",
      textAlign: "left",
    },
    "& .MuiInputBase-root": {
      direction: "ltr",
    },
    "& .MuiSelect-select": {
      direction: "ltr",
      textAlign: "left",
    },
  };

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
          {t("settings:businessRulesSectionTitle")}
        </Typography>
        <Stack spacing={4}>
            <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2, fontWeight: 500 }}>
              {t("settings:productsTableDisplayLabel")}
            </Typography>
            <Controller
              name="product_row_color_highlight"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                  label={<Box>
                    <Typography variant="body2" fontWeight={500}>{t("settings:lowStockRowHighlightLabel")}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("settings:lowStockRowHighlightDesc")}
                    </Typography>
                  </Box>}
                />
              )}
            />
          </Box>

        </Stack>
      </CardContent>
    </Card>
  );
};
