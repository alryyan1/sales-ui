import { useMemo } from "react";
import { formatCurrency as formatCurrencyUtil, CURRENCY_DECIMALS } from "@/constants";
import { useSettings } from "@/context/SettingsContext";

/**
 * Hook that provides a currency formatting function using app settings
 * @returns A function that formats numbers as currency using the app's currency symbol
 */
export const useFormatCurrency = () => {
  const { getSetting } = useSettings();
  const globalCurrencySymbol = getSetting("currency_symbol", "$");
  const currencyCode = getSetting("currency_code", "SDG");
  const decimals = CURRENCY_DECIMALS[currencyCode] ?? 0;

  return useMemo(
    () =>
      (
        value: string | number | null | undefined,
        overrideCurrency?: string,
        options?: Intl.NumberFormatOptions,
      ) => {
        // Use currency symbol from parameters or settings
        const symbol = overrideCurrency || globalCurrencySymbol;
        // Decimal count follows the selected currency (SDG=0, OMR=3, USD=2) unless the
        // caller explicitly overrides it via options.
        return formatCurrencyUtil(value, undefined, symbol, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
          ...options,
        });
      },
    [globalCurrencySymbol, decimals],
  );
};

/**
 * Hook that returns the currency symbol from settings
 */
export const useCurrencySymbol = () => {
  const { getSetting } = useSettings();
  return getSetting("currency_symbol", "$");
};
