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
  const [inputValue, setInputValue] = useState<string>(value?.toString?.() ?? '');

  useEffect(() => {
    setInputValue(value?.toString?.() ?? '');
  }, [value]);

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
