import { useMemo } from "react";
import { formatCurrency as formatCurrencyUtil } from "@/constants";
import { useSettings } from "@/context/SettingsContext";

/**
 * Hook that provides a currency formatting function using app settings
 * @returns A function that formats numbers as currency using the app's currency symbol
 */
export const useFormatCurrency = () => {
  const { getSetting } = useSettings();
  const currencySymbol = getSetting("currency_symbol", "$");

  return useMemo(
    () => (value: string | number | null | undefined, options?: Intl.NumberFormatOptions) => {
      // Use currency symbol from settings
      return formatCurrencyUtil(value, undefined, currencySymbol, options);
    },
    [currencySymbol]
  );
};

/**
 * Hook that returns the currency symbol from settings
 */
export const useCurrencySymbol = () => {
  const { getSetting } = useSettings();
  return getSetting("currency_symbol", "$");
};

