// export const host = 'sahara-pharma.com'
export const schema = "http";
// export const host = "lifcaresd.com";
export const host = "127.0.0.1";
export const projectFolder = "sales-api";
// export const host = 'server1'مركز النعيم
export function blurForNoramlUsers() {
  // return classname has filter properties
  return "blurForNormalUsers";
}
// export const url = `${schema}://${host}/system/${projectFolder}/public/api/`;
// export const webUrl = `${schema}://${host}/system/${projectFolder}/public/`;
// export const imagesUrl = `${schema}://${host}/system/${projectFolder}/public/`;
export const url = `${schema}://${host}/${projectFolder}/public/api/`;
export const webUrl = `${schema}://${host}/${projectFolder}/public/`;
export const imagesUrl = `${schema}://${host}/${projectFolder}/public/`;

export function formatNumber(
  number: number | string | null | undefined,
  decimals: number = 0
): string {
  if (number === null || number === undefined) return "---";

  const numValue = Number(number);
  if (isNaN(numValue)) {
    console.warn("formatNumber received a non-numeric value:", number);
    return "---";
  }

  // Fix floating-point precision issues by rounding to specified decimals
  const roundedNumber =
    Math.round(numValue * Math.pow(10, decimals)) / Math.pow(10, decimals);

  // Convert to string and split by decimal point
  const parts = roundedNumber.toString().split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1] || "";

  // Add commas to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  // Handle decimal part
  if (decimals === 0) {
    return formattedInteger;
  }

  // Pad decimal part with zeros if needed
  const paddedDecimal = decimalPart.padEnd(decimals, "0");

  return `${formattedInteger}.${paddedDecimal}`;
}

/**
 * Performs precise decimal arithmetic to avoid floating-point precision issues
 * @param a First number
 * @param b Second number
 * @param operation The operation to perform ('add', 'subtract', 'multiply', 'divide')
 * @param decimals Number of decimal places to round to (default: 2)
 * @returns Precise calculation result
 */
export function preciseCalculation(
  a: number,
  b: number,
  operation: "add" | "subtract" | "multiply" | "divide",
  decimals: number = 2
): number {
  const factor = Math.pow(10, decimals);

  switch (operation) {
    case "add":
      return Math.round((a + b) * factor) / factor;
    case "subtract":
      return Math.round((a - b) * factor) / factor;
    case "multiply":
      return Math.round(a * b * factor) / factor;
    case "divide":
      if (b === 0) throw new Error("Division by zero");
      return Math.round((a / b) * factor) / factor;
    default:
      throw new Error("Invalid operation");
  }
}

/**
 * Calculates the sum of an array of numbers with precise decimal arithmetic
 * @param numbers Array of numbers to sum
 * @param decimals Number of decimal places to round to (default: 2)
 * @returns Precise sum
 */
export function preciseSum(numbers: number[], decimals: number = 2): number {
  return numbers.reduce(
    (sum, num) => preciseCalculation(sum, num, "add", decimals),
    0
  );
}

/**
 * Formats a date string or Date object into a localized date string.
 *
 * @param dateInput The date to format (string, Date, number, or null/undefined).
 * @param locale The locale string (e.g., 'en-US', 'ar-SA'). Defaults to browser's locale.
 * @param options Intl.DateTimeFormat options.
 * @returns A formatted date string or a fallback string ('---').
 */
export const formatDate = (
  dateInput: string | Date | number | null | undefined,
  locale?: string, // Example: 'ar-SA' for Arabic (Saudi Arabia)
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!dateInput) return "---";

  let dateToFormat: Date;
  if (typeof dateInput === "string") {
    // Attempt to parse common ISO-like formats (YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss)
    // date-fns parseISO is more robust if you have it: dateToFormat = parseISO(dateInput);
    dateToFormat = new Date(
      dateInput.includes("T") ? dateInput : dateInput + "T00:00:00"
    ); // Add time to avoid timezone issues for YYYY-MM-DD
  } else if (dateInput instanceof Date) {
    dateToFormat = dateInput;
  } else if (typeof dateInput === "number") {
    dateToFormat = new Date(dateInput);
  } else {
    return "---";
  }

  if (isNaN(dateToFormat.getTime())) {
    // Check for invalid date
    console.warn("formatDate received an invalid date input:", dateInput);
    return "---";
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short", // 'long', 'numeric', '2-digit'
    day: "numeric", // '2-digit'
    ...options, // Merge with user-provided options
  };

  try {
    // If no locale is provided, Intl.DateTimeFormat uses the browser's default locale.
    return new Intl.DateTimeFormat(locale, defaultOptions).format(dateToFormat);
  } catch (e) {
    console.error("Error formatting date:", e, "Input:", dateInput);
    // Fallback to simpler formatting if Intl fails for some reason
    return dateToFormat.toLocaleDateString();
  }
};

/**
 * Formats a number as a currency string.
 *
 * @param value The number to format.
 * @param locale The locale string (e.g., 'en-US', 'ar-SA'). Defaults to browser's locale.
 * @param currencySymbolOrCode The currency symbol (e.g., 'ريال', '$') or ISO 4217 currency code (e.g., 'USD', 'EUR', 'SAR'). Defaults to 'SDG'.
 * @param options Intl.NumberFormat options for currency.
 * @returns A formatted currency string or a fallback string ('---').
 */
export const formatCurrency = (
  value: string | number | null | undefined,
  locale?: string, // Example: 'ar-SA' for Arabic (Saudi Arabia)
  currencySymbolOrCode: string = "SDG", // Default currency set globally to Sudanese Pound
  options?: Intl.NumberFormatOptions
): string => {
  if (value === null || value === undefined) return "---";

  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    console.warn("formatCurrency received a non-numeric value:", value);
    return "---";
  }

  // Check if currencySymbolOrCode is a 3-letter currency code (like USD, SAR, EUR)
  const isCurrencyCode = /^[A-Z]{3}$/.test(currencySymbolOrCode);

  if (isCurrencyCode) {
    // Use Intl.NumberFormat for standard currency codes
    const defaultOptions: Intl.NumberFormatOptions = {
      style: "currency",
      currency: currencySymbolOrCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    };

    // Merge options properly - user options should override defaults
    const finalOptions = {
      ...defaultOptions,
      ...options,
    };

    try {
      // If no locale is provided, Intl.NumberFormat uses the browser's default locale.
      return new Intl.NumberFormat(locale, finalOptions).format(numberValue);
    } catch (e) {
      console.error(
        "Error formatting currency:",
        e,
        "Value:",
        value,
        "Currency:",
        currencySymbolOrCode
      );
      // Fallback to simpler formatting if Intl fails
      return `${currencySymbolOrCode} ${formatNumber(numberValue)}`;
    }
  } else {
    // For custom currency symbols (like "ريال", "$"), format manually
    const formattedNumber = formatNumber(
      numberValue,
      options?.maximumFractionDigits ?? 0
    );
    // RTL-aware: Put symbol after number for Arabic, before for English
    const isRTL =
      locale?.startsWith("ar") || document.documentElement.dir === "rtl";
    return isRTL
      ? `${formattedNumber} ${currencySymbolOrCode}`
      : `${currencySymbolOrCode} ${formattedNumber}`;
  }
};

/**
 * Format date as dd,mm,yyyy (e.g., 15,01,2025)
 */
export const formatDateDDMMYYYY = (
  dateInput: string | Date | number | null | undefined
): string => {
  if (!dateInput) return "---";

  let dateToFormat: Date;
  if (typeof dateInput === "string") {
    dateToFormat = new Date(
      dateInput.includes("T") ? dateInput : dateInput + "T00:00:00"
    );
  } else if (dateInput instanceof Date) {
    dateToFormat = dateInput;
  } else if (typeof dateInput === "number") {
    dateToFormat = new Date(dateInput);
  } else {
    return "---";
  }

  if (isNaN(dateToFormat.getTime())) {
    console.warn("formatDateDDMMYYYY received an invalid date input:", dateInput);
    return "---";
  }

  const day = String(dateToFormat.getDate()).padStart(2, "0");
  const month = String(dateToFormat.getMonth() + 1).padStart(2, "0");
  const year = dateToFormat.getFullYear();

  return `${day},${month},${year}`;
};
