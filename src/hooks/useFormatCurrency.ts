import { useMemo } from "react";
import { formatCurrency as formatCurrencyUtil } from "@/constants";
import { useSettings } from "@/context/SettingsContext";

/**
 * Hook that provides a currency formatting function using app settings
 * @returns A function that formats numbers as currency using the app's currency symbol
 */
export const useFormatCurrency = () => {
  const { getSetting } = useSettings();
  const globalCurrencySymbol = getSetting("currency_symbol", "OMR");

  return useMemo(
    () =>
      (
        value: string | number | null | undefined,
        overrideCurrency?: string,
        options?: Intl.NumberFormatOptions,
      ) => {
        // Use currency symbol from parameters or settings
        const symbol = overrideCurrency || globalCurrencySymbol;
        return formatCurrencyUtil(value, undefined, symbol, options);
      },
    [globalCurrencySymbol],
  );
};

/**
 * Hook that returns the currency symbol from settings
 */
export const useCurrencySymbol = () => {
  const { getSetting } = useSettings();
  return getSetting("currency_symbol", "OMR");
};
