// src/AppRoot.tsx
import React, { useEffect, useMemo } from "react";
import { RouterProvider } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@mui/material";
import { useTranslation } from "react-i18next";

import { getTheme, getEmotionCache } from "./theme";
import router from "./router";

/**
 * Wraps the app in a MUI theme + Emotion cache that flip between
 * RTL (Arabic) and LTR (English) whenever the active i18n language changes.
 */
const AppRoot: React.FC = () => {
  const { i18n } = useTranslation();
  const direction = i18n.dir(); // 'rtl' | 'ltr' based on the current language

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
    document.body.dir = direction;
  }, [direction, i18n.language]);

  const theme = useMemo(() => getTheme(direction), [direction]);
  const cache = useMemo(() => getEmotionCache(direction), [direction]);

  return (
    <CacheProvider value={cache}>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </LocalizationProvider>
    </CacheProvider>
  );
};

export default AppRoot;
