// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import i18n from "@/i18n";

export type Language = "ar" | "en";
export type Direction = "rtl" | "ltr";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  direction: Direction;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  storageKey = "app-language",
}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(storageKey) as Language | null;
      return stored === "en" || stored === "ar" ? stored : "ar";
    } catch (e) {
      console.warn("Failed to access localStorage for language, using default.", e);
      return "ar";
    }
  });

  const direction: Direction = useMemo(() => (language === "ar" ? "rtl" : "ltr"), [language]);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, direction]);

  const setLanguage = (newLanguage: Language) => {
    try {
      localStorage.setItem(storageKey, newLanguage);
    } catch (e) {
      console.warn("Failed to save language to localStorage.", e);
    }
    setLanguageState(newLanguage);
  };

  const value = { language, setLanguage, direction };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
