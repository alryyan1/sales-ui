import { forwardRef } from "react";
import { Box, IconButton, Button, Typography, Paper } from "@mui/material";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PurchaseFormPageHeaderProps {
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const PurchaseFormPageHeader = forwardRef<
  HTMLDivElement,
  PurchaseFormPageHeaderProps
>(
  ({ onBack, onSubmit, isSubmitting }, ref) => {
    const { t } = useTranslation("purchases");
    const { t: tCommon } = useTranslation("common");

    return (
    <Paper
      ref={ref}
      elevation={0}
      sx={{
        p: 2,
        mb: 2,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <IconButton
          onClick={onBack}
          size="small"
          sx={{
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <ArrowLeft size={18} />
        </IconButton>

        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t("quickAddTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("quickAddSubtitle")}
          </Typography>
        </Box>
      </Box>

      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={isSubmitting}
        startIcon={
          isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )
        }
        sx={{
          textTransform: "none",
          fontWeight: 600,
          px: 3,
          py: 1.25,
          minWidth: { xs: "100%", sm: 136 },
        }}
      >
        {isSubmitting ? tCommon("saving") : tCommon("create")}
      </Button>
    </Paper>
    );
  },
);

PurchaseFormPageHeader.displayName = "PurchaseFormPageHeader";

export default PurchaseFormPageHeader;
