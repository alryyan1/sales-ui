// src/theme.ts
import { createTheme, type Theme } from "@mui/material/styles";
import { arEG, enUS } from "@mui/material/locale";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";

export type AppDirection = "rtl" | "ltr";

// Emotion caches: one per direction, so MUI's `sx`/styled-components flip
// physical CSS properties (margin/padding/left/right) automatically.
export const cacheRtl = createCache({
  key: "mui-rtl",
  stylisPlugins: [prefixer, rtlPlugin],
});

export const cacheLtr = createCache({
  key: "mui-ltr",
  stylisPlugins: [prefixer],
});

export const getEmotionCache = (direction: AppDirection) =>
  direction === "rtl" ? cacheRtl : cacheLtr;

const FONT_FAMILY = '"Tajawal", "Arial", sans-serif';

export const getTheme = (direction: AppDirection): Theme =>
  createTheme(
    {
      direction,
      typography: {
        fontFamily: FONT_FAMILY,
        h1: { fontWeight: 700 },
        h2: { fontWeight: 700 },
        h3: { fontWeight: 700 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600 },
      },
      palette: {
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
        background: {
          default: "#fafafa",
          paper: "#ffffff",
        },
      },
      shape: {
        borderRadius: 8,
      },
      components: {
        // NOTE: do not set `direction` here. This block is emitted through
        // the direction-aware emotion cache (see getEmotionCache), and
        // stylis-plugin-rtl blindly flips the literal "rtl"/"ltr" strings
        // it finds — including inside our own `direction:` declarations —
        // which silently inverts it. `document.documentElement`/`body.dir`
        // (set in AppRoot.tsx) are the single source of truth for direction.
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              fontFamily: FONT_FAMILY,
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
    direction === "rtl" ? arEG : enUS
  );

// Backwards-compatible default export (RTL, matches the previous static theme).
const theme = getTheme("rtl");
export default theme;
