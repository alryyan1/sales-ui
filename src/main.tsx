// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import "./i18n"; // <--- تأكد من وجود هذا الاستيراد هنا
import { LocalizationProvider } from "@mui/x-date-pickers"; // Import LocalizationProvider
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"; // Import AdapterDateFns

// استيراد الإعدادات المخصصة
import theme from "./theme"; // استيراد Theme الـ MUI المخصص (مع RTL)
import "./index.css"; // استيراد CSS العام (اختياري)
import router from "./router";
import { SettingsProvider } from "./context/SettingsContext";

console.log("main.tsx: Initializing application...");

// --- REMOVE initializeCsrfToken() call ---
// initializeCsrfToken().then(() => { ... }).catch(...)

// --- Render directly ---
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <SettingsProvider>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <RouterProvider router={router} />
        </ThemeProvider>
      </LocalizationProvider>
    </SettingsProvider>
  </React.StrictMode>
);
