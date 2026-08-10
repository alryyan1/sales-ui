// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers"; // Import LocalizationProvider
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"; // Import AdapterDateFns
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// استيراد الإعدادات المخصصة
import { getTheme, cacheRtl } from "./theme"; // استيراد Theme الـ MUI المخصص (مع RTL)
import { CacheProvider } from "@emotion/react";
import "./fonts/tajawal.css"; // استيراد خط Tajawal المحلي
import "./index.css"; // استيراد CSS العام (اختياري)
import router from "./router";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider as TailwindTheme, useTheme as useTailwindTheme } from "./context/ThemeContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import "./i18n";
import { ThemeProvider } from "@mui/material";
import { useMemo } from "react";

// Bridges the app's light/dark ThemeContext and language/direction into the
// MUI theme, so MUI components (tables, dialogs, admin pages) follow the
// same mode and direction instead of always rendering light/RTL.
function MuiThemeBridge({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTailwindTheme();
  const { direction } = useLanguage();
  const muiTheme = useMemo(() => getTheme(resolvedTheme, direction), [resolvedTheme, direction]);
  return <ThemeProvider theme={muiTheme}>{children}</ThemeProvider>;
}

console.log("main.tsx: Initializing application...");

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// --- REMOVE initializeCsrfToken() call ---
// initializeCsrfToken().then(() => { ... }).catch(...)

// --- Render directly ---
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  // <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <SettingsProvider>
          <TailwindTheme defaultTheme="system" storageKey="app-ui-theme">
            <CacheProvider value={cacheRtl}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <MuiThemeBridge>
                  <CssBaseline />
                  <RouterProvider router={router} />
                </MuiThemeBridge>
              </LocalizationProvider>
            </CacheProvider>
          </TailwindTheme>
        </SettingsProvider>
      </LanguageProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  // </React.StrictMode>
);
