// src/theme.ts
import { createTheme } from "@mui/material/styles";
import { arEG } from "@mui/material/locale";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";

// Create cache for Brand (LTR default)
// Removed rtlPlugin to ensure LTR direction
export const cacheRtl = createCache({
  key: "mui-style",
  stylisPlugins: [prefixer],
});

// Create MUI theme (LTR)
const theme = createTheme(
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

export default theme;
