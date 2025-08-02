// src/components/purchases/EditablePurchaseItemField.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// MUI Components
import { 
  TextField, 
  IconButton, 
  Box,
  Typography,
  Tooltip
} from '@mui/material';
import { 
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon
} from '@mui/icons-material';

interface EditablePurchaseItemFieldProps {
  value: string | number;
  onSave: (newValue: string | number) => void;
  type?: 'text' | 'number';
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  isLoading?: boolean;
  formatDisplay?: (value: string | number) => string;
  parseValue?: (value: string) => string | number;
}

export const EditablePurchaseItemField: React.FC<EditablePurchaseItemFieldProps> = ({
  value,
  onSave,
  type = 'text',
  disabled = false,
  placeholder,
  label,
  min,
  max,
  step,
  isLoading = false,
  formatDisplay,
  parseValue
}) => {
  const { t } = useTranslation(['common']);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Update editValue when value prop changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value.toString());
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Use setSelectionRange for better compatibility, especially with number inputs
      try {
        if (typeof inputRef.current.select === 'function') {
          inputRef.current.select();
        } else {
          // Alternative for inputs that don't support select()
          inputRef.current.setSelectionRange(0, inputRef.current.value.length);
        }
      } catch (error) {
        // Fallback - just focus without selection
        console.warn('Could not select input text:', error);
      }
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (disabled || isLoading) return;
    setIsEditing(true);
    setEditValue(value.toString());
  }, [disabled, isLoading, value]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(value.toString());
  }, [value]);

  const handleSave = useCallback(() => {
    if (editValue.trim() === '' && type === 'text') {
      handleCancelEdit();
      return;
    }

    const newValue = parseValue ? parseValue(editValue) : 
                     type === 'number' ? Number(editValue) : editValue;

    // Only save if value actually changed
    if (newValue !== value) {
      onSave(newValue);
    }
    
    setIsEditing(false);
  }, [editValue, type, parseValue, value, onSave, handleCancelEdit]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  }, [handleSave, handleCancelEdit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow click events on save/cancel buttons
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      if (isEditing) {
        handleSave();
      }
    }, 150);
  }, [isEditing, handleSave]);

  const displayValue = formatDisplay ? formatDisplay(value) : value.toString();

  if (isEditing) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
        <TextField
          ref={inputRef}
          value={editValue}
          onFocus={(e)=>e.target.select()}
          onChange={handleInputChange}
          onKeyDown={handleKeyPress}
          onBlur={handleBlur}
          size="small"
          type={type}
          placeholder={placeholder}
          InputProps={{
            style: { fontSize: '0.875rem' },
            inputProps: {
              min,
              max,
              step,
            }
          }}
          sx={{ 
            minWidth: 80,
            '& .MuiInputBase-input': {
              padding: '4px 8px',
            }
          }}
        />
        <IconButton
          size="small"
          onClick={handleSave}
          disabled={isLoading}
          color="primary"
        >
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={handleCancelEdit}
          disabled={isLoading}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        cursor: disabled ? 'default' : 'pointer',
        padding: '4px 8px',
        borderRadius: 1,
        '&:hover': disabled ? {} : {
          backgroundColor: 'action.hover',
        },
        minHeight: 32,
        minWidth: 80,
      }}
      onClick={handleStartEdit}
    >
      <Typography 
        variant="body2" 
        sx={{ 
          flex: 1,
          color: disabled ? 'text.disabled' : 'text.primary',
          fontSize: '0.875rem'
        }}
      >
        {displayValue || placeholder || '—'}
      </Typography>
      {!disabled && !isLoading && (
        <Tooltip title={t('common:edit')}>
          <IconButton
            size="small"
            sx={{ 
              opacity: 0.5,
              '&:hover': { opacity: 1 }
            }}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default EditablePurchaseItemField;