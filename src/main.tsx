// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// استيراد الإعدادات المخصصة
import "./i18n"; // تهيئة i18next (يجب استيرادها قبل أي مكون يستخدم الترجمة)
import "./fonts/tajawal.css"; // استيراد خط Tajawal المحلي
import "./index.css"; // استيراد CSS العام (اختياري)
import { registerPdfFonts } from "./utils/pdfFontRegistry";

// Register PDF fonts
registerPdfFonts();
import AppRoot from "./AppRoot";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider as TailwindTheme } from "./context/ThemeContext";

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
      <SettingsProvider>
        <TailwindTheme defaultTheme="system" storageKey="app-ui-theme">
          <AppRoot />
        </TailwindTheme>
      </SettingsProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  // </React.StrictMode>
);
