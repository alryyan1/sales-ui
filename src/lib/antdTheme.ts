// src/lib/antdTheme.ts
import { theme as antdTheme, type ThemeConfig } from "antd";

export const ANTD_FONT_FAMILY =
  '"Tajawal", "Arial", sans-serif';

export function getAntdThemeConfig(resolvedTheme: "light" | "dark"): ThemeConfig {
  return {
    algorithm: resolvedTheme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      fontFamily: ANTD_FONT_FAMILY,
    },
  };
}
