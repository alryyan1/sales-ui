// src/main.tsx

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import './i18n'; // <--- تأكد من وجود هذا الاستيراد هنا

// استيراد الإعدادات المخصصة
import theme from "./theme"; // استيراد Theme الـ MUI المخصص (مع RTL)
import "./index.css"; // استيراد CSS العام (اختياري)
import router from "./router";

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
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>
);
