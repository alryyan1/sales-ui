// src/theme.ts
import { createTheme, type PaletteMode } from "@mui/material/styles";
import { arEG } from "@mui/material/locale";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";

// This app hand-authors physical left/right styles directly for RTL
// (rather than authoring LTR and relying on an auto-flip plugin), so
// stylis-plugin-rtl is intentionally NOT used here — enabling it double-flips
// every hand-tuned left/right, margin-left/right, and MUI anchor="right"
// value, turning the whole RTL layout into a mirrored/LTR-looking one.
export const cacheRtl = createCache({
  key: "mui-style",
  stylisPlugins: [prefixer],
});

export function getTheme(mode: PaletteMode) {
  return createTheme(
    {
      direction: "rtl",
      typography: {
        fontFamily: '"Tajawal", "Arial", sans-serif',
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600 },
      },
      palette: {
        mode,
        primary: {
          main: "#1976d2",
          light: "#42a5f5",
          dark: "#1565c0",
          contrastText: "#fff",
        },
        secondary: {
          main: "#9c27b0",
          light: "#ba68c8",
          dark: "#7b1fa2",
          contrastText: "#fff",
        },
        error: {
          main: "#d32f2f",
          light: "#ffebee",
        },
        warning: {
          main: "#ed6c02",
          light: "#fff3e0",
        },
        info: {
          main: "#0288d1",
          light: "#e3f2fd",
        },
        success: {
          main: "#2e7d32",
          light: "#e8f5e9",
        },
        background:
          mode === "dark"
            ? { default: "#121212", paper: "#1e1e1e" }
            : { default: "#fafafa", paper: "#ffffff" },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            html: {
              direction: "rtl",
            },
            body: {
              direction: "rtl",
              fontFamily: '"Tajawal", "Arial", sans-serif',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            startIcon: {
              marginLeft: "12px",
            },
            root: {
              textTransform: "none",
              fontWeight: 600,
            },
          },
        },
        MuiTextField: {
          defaultProps: {
            variant: "outlined",
            size: "small",
          },
        },
        MuiCard: {
          styleOverrides: {
            root: {
              borderRadius: 12,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
          },
        },
        MuiAlert: {
          styleOverrides: {
            root: {
              borderRadius: 8,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              fontWeight: 500,
            },
          },
        },
        MuiAutocomplete: {
          defaultProps: {
            slotProps: { paper: { dir: "ltr" } as any },
            ListboxProps: { dir: "ltr" } as any,
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 12,
            },
          },
        },
      },
    },
    arEG
  );
}

export default getTheme("light");
