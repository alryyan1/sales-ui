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

  return (
    <TextField
      onFocus={(e) => {
        e.target.select();
      }}
      value={inputValue}
      
      onChange={handleChange}
      type={type}
      placeholder={placeholder}
      label={label}
      size={size}
      fullWidth
      disabled={disabled}
      InputProps={{
        style: { fontSize: '0.875rem' },
        inputProps: {
          min,
          max,
          step,
        },
      }}
      sx={{
        minWidth: 120,
        width: '100%',
        '& .MuiInputBase-input': {
          padding: '4px 8px',
        },
      }}
    />
  );
};

export default InstantTextField;


