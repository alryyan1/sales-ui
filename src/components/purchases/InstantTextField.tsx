// src/components/purchases/InstantTextField.tsx
import React, { useEffect, useState } from "react";
import { TextField } from "@mui/material";

type InputType = "text" | "number" | "date";

interface InstantTextFieldProps {
  value: string | number;
  onChangeValue: (value: string | number) => void;
  type?: InputType;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  min?: number | string;
  max?: number | string;
  step?: number;
  size?: "small" | "medium";
  error?: boolean;
  helperText?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

const InstantTextField: React.FC<InstantTextFieldProps> = ({
  value,
  onChangeValue,
  type = "text",
  disabled = false,
  placeholder,
  label,
  min,
  max,
  step,
  size = "small",
  error,
  helperText,
  inputRef,
}) => {
  // Format number to remove unnecessary decimal places for integers
  const formatNumberValue = React.useCallback(
    (val: string | number): string => {
      if (
        type === "number" &&
        val !== "" &&
        val !== null &&
        val !== undefined
      ) {
        // Handle string values that might have trailing zeros (e.g., "5.00", "5.0")
        if (typeof val === "string" && val.includes(".")) {
          // Remove trailing zeros and decimal point if all zeros
          const cleaned = val.replace(/\.?0+$/, "");
          const num = Number(cleaned);
          if (!isNaN(num)) {
            // If it's an integer, return without decimal point
            if (Number.isInteger(num)) {
              return num.toString();
            }
            return cleaned;
          }
        }

        const num = Number(val);
        if (!isNaN(num)) {
          // If it's an integer (no meaningful decimal part), return without decimals
          // Check if the number is effectively an integer (e.g., 5.0, 5.00, etc.)
          if (
            Number.isInteger(num) ||
            Math.abs(num - Math.round(num)) < Number.EPSILON
          ) {
            return Math.round(num).toString();
          }
          // Otherwise, return the number as string and remove trailing zeros
          // This handles cases like 5.50 -> 5.5, but keeps 5.5 as 5.5
          const str = num.toString();
          // Remove trailing zeros after decimal point
          return str.includes(".") ? str.replace(/\.?0+$/, "") : str;
        }
      }
      return val?.toString?.() ?? "";
    },
    [type],
  );

  const [inputValue, setInputValue] = useState<string>(() =>
    formatNumberValue(value),
  );

  useEffect(() => {
    setInputValue(formatNumberValue(value));
  }, [value, formatNumberValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // For date type, automatically set to last day of month
    if (type === "date" && raw) {
      const date = new Date(raw);
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      const formattedDate = lastDay.toISOString().split("T")[0];
      setInputValue(formattedDate);
      return;
    }

    // Only update local state, don't trigger onChangeValue yet
    setInputValue(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Trigger update
      if (type === "number") {
        const parsed = inputValue === "" ? "" : Number(inputValue);
        onChangeValue(parsed as number | "");
      } else {
        onChangeValue(inputValue);
      }

      // Focus next field with a small delay to ensure DOM is ready
      setTimeout(() => {
        const currentInput = e.currentTarget;
        // Find all visible, enabled input elements in the document
        const allInputs = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            'input[type="text"], input[type="number"], input[type="date"]',
          ),
        ).filter((input) => {
          // Filter out disabled and hidden inputs
          return (
            !input.disabled &&
            input.offsetParent !== null && // Check if visible
            input.type !== "hidden"
          );
        });

        const currentIndex = allInputs.indexOf(currentInput);

        if (currentIndex !== -1 && currentIndex < allInputs.length - 1) {
          const nextInput = allInputs[currentIndex + 1];
          nextInput?.focus();
          // Use setTimeout to select after focus
          setTimeout(() => {
            nextInput?.select();
          }, 0);
        }
      }, 0);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <TextField
      value={inputValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      type={type}
      placeholder={placeholder}
      label={label}
      size={size}
      fullWidth
      disabled={disabled}
      error={error}
      helperText={helperText}
      inputRef={inputRef}
      InputProps={{
        inputProps: { min, max, step },
      }}
      sx={{
        "& .MuiInputBase-input": {
          padding: "8px 12px",
          fontSize: "0.875rem",
        },
      }}
    />
  );
};

export default InstantTextField;
