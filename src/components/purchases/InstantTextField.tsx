// src/components/purchases/InstantTextField.tsx
import React, { useEffect, useState } from 'react';
import { TextField } from '@mui/material';

type InputType = 'text' | 'number' | 'date';

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
  size?: 'small' | 'medium';
  error?: boolean;
  helperText?: string;
}

const InstantTextField: React.FC<InstantTextFieldProps> = ({
  value,
  onChangeValue,
  type = 'text',
  disabled = false,
  placeholder,
  label,
  min,
  max,
  step,
  size = 'small',
  error,
  helperText,
}) => {
  // Format number to remove unnecessary decimal places for integers
  const formatNumberValue = React.useCallback((val: string | number): string => {
    if (type === 'number' && val !== '' && val !== null && val !== undefined) {
      // Handle string values that might have trailing zeros (e.g., "5.00", "5.0")
      if (typeof val === 'string' && val.includes('.')) {
        // Remove trailing zeros and decimal point if all zeros
        const cleaned = val.replace(/\.?0+$/, '');
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
        if (Number.isInteger(num) || Math.abs(num - Math.round(num)) < Number.EPSILON) {
          return Math.round(num).toString();
        }
        // Otherwise, return the number as string and remove trailing zeros
        // This handles cases like 5.50 -> 5.5, but keeps 5.5 as 5.5
        const str = num.toString();
        // Remove trailing zeros after decimal point
        return str.includes('.') ? str.replace(/\.?0+$/, '') : str;
      }
    }
    return val?.toString?.() ?? '';
  }, [type]);

  const [inputValue, setInputValue] = useState<string>(() => formatNumberValue(value));

  useEffect(() => {
    setInputValue(formatNumberValue(value));
  }, [value, formatNumberValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputValue(raw);
    if (type === 'number') {
      const parsed = raw === '' ? '' : Number(raw);
      onChangeValue(parsed as number | '');
    } else {
      onChangeValue(raw);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <TextField
      value={inputValue}
      onChange={handleChange}
      onFocus={handleFocus}
      type={type}
      placeholder={placeholder}
      label={label}
      size={size}
      fullWidth
      disabled={disabled}
      error={error}
      helperText={helperText}
      InputProps={{
        inputProps: { min, max, step },
      }}
      sx={{
        '& .MuiInputBase-input': {
          padding: '8px 12px',
          fontSize: '0.875rem',
        },
      }}
    />
  );
};

export default InstantTextField;
