// src/context/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: "light" | "dark"; // The actual theme being applied (after resolving 'system')
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
    storageKey?: string; // Key for localStorage
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme", // Match shadcn/ui default if using their examples
}) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        try {
            const storedTheme = localStorage.getItem(storageKey) as Theme | null;
            return storedTheme || defaultTheme;
        } catch (e) {
            console.warn("Failed to access localStorage for theme, using default.", e);
            return defaultTheme;
        }
    });

    // Determine the actual theme being applied (light or dark), resolving 'system'
    const resolvedTheme = useMemo(() => {
        if (theme === "system") {
            return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        return theme;
    }, [theme]);


    useEffect(() => {
        const root = window.document.documentElement; // <html> element
        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            root.classList.add(systemTheme);
            console.log("Applied system theme:", systemTheme);
            return;
        }

        root.classList.add(theme);
        console.log("Applied explicit theme:", theme);
    }, [theme]); // Re-run when theme changes

    // Listen to system theme changes if current theme is 'system'
    useEffect(() => {
        if (theme !== 'system') return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            // This effect will trigger a re-render via 'resolvedTheme' if needed,
            // and the main useEffect will re-apply the class to <html>
            console.log("System theme changed, re-evaluating resolvedTheme.");
            // Force re-evaluation by temporarily changing theme then changing back (a bit hacky but forces update)
            // A better way might involve a dedicated state for resolvedTheme that updates here.
            // For now, the existing useEffect for 'theme' should re-apply based on the new system preference
            // if it detects a change in resolvedTheme.
            // To be more explicit:
             const newSystemTheme = mediaQuery.matches ? "dark" : "light";
             document.documentElement.classList.remove("light", "dark");
             document.documentElement.classList.add(newSystemTheme);
             console.log("System theme listener updated html class to:", newSystemTheme);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]); // Only run when theme is 'system'


    const setTheme = (newTheme: Theme) => {
        try {
            localStorage.setItem(storageKey, newTheme);
        } catch (e) {
            console.warn("Failed to save theme to localStorage.", e);
        }
        setThemeState(newTheme);
    };

    const value = { theme, setTheme, resolvedTheme };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};