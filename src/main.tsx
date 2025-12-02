// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import "./i18n"; // <--- تأكد من وجود هذا الاستيراد هنا
import { LocalizationProvider } from "@mui/x-date-pickers"; // Import LocalizationProvider
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"; // Import AdapterDateFns
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// استيراد الإعدادات المخصصة
import theme, { cacheRtl } from "./theme"; // استيراد Theme الـ MUI المخصص (مع RTL)
import { CacheProvider } from "@emotion/react";
import "./index.css"; // استيراد CSS العام (اختياري)
import router from "./router";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider as TailwindTheme } from "./context/ThemeContext";
import { ThemeProvider } from "@mui/material";

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
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <TailwindTheme  defaultTheme="system" storageKey="app-ui-theme">
        <CacheProvider value={cacheRtl}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <RouterProvider router={router} />
            </ThemeProvider>
          </LocalizationProvider>
        </CacheProvider>
        </TailwindTheme>
      </SettingsProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
