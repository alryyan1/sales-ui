// src/lib/posTheme.ts
// Material Design–style accent colors the cashier can pick for PosPage.
// Applied by setting CSS custom properties directly on <body> (see ThemeColorPicker),
// so it reaches everything under body — including the global TopAppBar and Radix
// portals (Dialog/Popover/AlertDialog render outside PosPage's own DOM subtree).

export interface PosThemeColor {
  id: string;
  name: string;
  primary: string;
  ring: string;
  foreground: string;
}

export const POS_THEME_COLORS: PosThemeColor[] = [
  { id: "sky", name: "أزرق سماوي", primary: "#0ea5e9", ring: "#38bdf8", foreground: "#ffffff" },
  { id: "blue", name: "أزرق", primary: "#2196f3", ring: "#64b5f6", foreground: "#ffffff" },
  { id: "indigo", name: "نيلي", primary: "#3f51b5", ring: "#7986cb", foreground: "#ffffff" },
  { id: "purple", name: "بنفسجي", primary: "#9c27b0", ring: "#ba68c8", foreground: "#ffffff" },
  { id: "pink", name: "وردي", primary: "#e91e63", ring: "#f06292", foreground: "#ffffff" },
  { id: "red", name: "أحمر", primary: "#f44336", ring: "#e57373", foreground: "#ffffff" },
  { id: "deep-orange", name: "برتقالي عميق", primary: "#ff5722", ring: "#ff8a65", foreground: "#ffffff" },
  { id: "orange", name: "برتقالي", primary: "#ff9800", ring: "#ffb74d", foreground: "#ffffff" },
  { id: "amber", name: "كهرماني", primary: "#ffc107", ring: "#ffd54f", foreground: "#1f2937" },
  { id: "green", name: "أخضر", primary: "#4caf50", ring: "#81c784", foreground: "#ffffff" },
  { id: "teal", name: "تركواز", primary: "#009688", ring: "#4db6ac", foreground: "#ffffff" },
  { id: "blue-grey", name: "رمادي مزرق", primary: "#607d8b", ring: "#90a4ae", foreground: "#ffffff" },
];

export const DEFAULT_POS_THEME_COLOR_ID = "sky";

const STORAGE_KEY = "pos-theme-color";

export function getPosThemeColor(id: string | null): PosThemeColor {
  return POS_THEME_COLORS.find((c) => c.id === id) ?? POS_THEME_COLORS[0];
}

export function loadPosThemeColorId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_POS_THEME_COLOR_ID;
  } catch {
    return DEFAULT_POS_THEME_COLOR_ID;
  }
}

export function savePosThemeColorId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Persistence is a nice-to-have — ignore quota/availability errors.
  }
}

export function applyPosThemeColor(color: PosThemeColor) {
  document.body.style.setProperty("--primary", color.primary);
  document.body.style.setProperty("--primary-foreground", color.foreground);
  document.body.style.setProperty("--ring", color.ring);
}

export function clearPosThemeColor() {
  document.body.style.removeProperty("--primary");
  document.body.style.removeProperty("--primary-foreground");
  document.body.style.removeProperty("--ring");
}
