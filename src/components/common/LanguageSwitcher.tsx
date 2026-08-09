// src/components/common/LanguageSwitcher.tsx
import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Tooltip } from "@mui/material";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  size?: "small" | "medium" | "large";
}

/** Toggles the active UI language between Arabic and English. */
const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ size = "small" }) => {
  const { i18n, t } = useTranslation("common");
  const isArabic = i18n.language === "ar";

  const toggleLanguage = () => {
    i18n.changeLanguage(isArabic ? "en" : "ar");
  };

  return (
    <Tooltip title={t("switchLanguage")}>
      <Button
        onClick={toggleLanguage}
        size={size}
        variant="outlined"
        color="inherit"
        startIcon={<Languages size={16} />}
        sx={{
          minWidth: 0,
          px: 1.25,
          fontWeight: 600,
          textTransform: "none",
          borderColor: "divider",
        }}
      >
        {isArabic ? "EN" : "ع"}
      </Button>
    </Tooltip>
  );
};

export default LanguageSwitcher;
