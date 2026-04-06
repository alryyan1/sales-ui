// src/components/common/PackageAutocomplete.tsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

// MUI Components
import { 
  TextField, 
  Typography, 
  Box,
  Tooltip,
  IconButton
} from "@mui/material";
import { 
  ContentCopy as CopyIcon
} from "@mui/icons-material";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";

// Types
import { Package } from "../../services/packageService";
import packageService from "../../services/packageService";

interface PackageAutocompleteProps {
  value: Package | null;
  onChange: (pkg: Package | null) => void;
  onInputChange?: (inputValue: string) => void;
  inputValue?: string;
  label?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  size?: "small" | "medium";
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

// Memoized package option component for better performance
const PackageOption = React.memo(({ option }: { option: Package }) => (
  <Box>
    <Typography variant="body2" component="span">
      {option.name}
    </Typography>
    {option.items && option.items.length > 0 && (
      <Typography variant="caption" color="text.secondary" display="block">
        {option.items.length} منتج
      </Typography>
    )}
  </Box>
));

PackageOption.displayName = 'PackageOption';

export const PackageAutocomplete: React.FC<PackageAutocompleteProps> = React.memo(({
  value,
  onChange,
  onInputChange,
  inputValue: externalInputValue,
  label,
  error = false,
  helperText,
  disabled = false,
  size = "small",
  placeholder,
  required = false,
  className,
  id,
}) => {
  // Internal state for this component
  const [packageSearchInput, setPackageSearchInput] = useState("");
  const [debouncedPackageSearch, setDebouncedPackageSearch] = useState("");
  const [localPackages, setLocalPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const packageDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastPackageSearchRef = useRef<string>("");
  const autocompleteRef = useRef<HTMLInputElement>(null);

  // Use external input value if provided, otherwise use internal state
  const currentInputValue = externalInputValue !== undefined ? externalInputValue : packageSearchInput;

  // Debounced package search effect
  useEffect(() => {
    if (packageDebounceRef.current) {
      clearTimeout(packageDebounceRef.current);
    }
    
    packageDebounceRef.current = setTimeout(() => {
      setDebouncedPackageSearch(packageSearchInput);
    }, 300);
    
    return () => {
      if (packageDebounceRef.current) {
        clearTimeout(packageDebounceRef.current);
      }
    };
  }, [packageSearchInput]);

  // Package search effect
  useEffect(() => {
    if (debouncedPackageSearch !== lastPackageSearchRef.current) {
      lastPackageSearchRef.current = debouncedPackageSearch;
      
      const searchPackages = async () => {
        setLoadingPackages(true);
        try {
          const packages = await packageService.getPackagesForAutocomplete(
            debouncedPackageSearch,
            15
          );
          setLocalPackages(packages);
        } catch (error) {
          console.error('Error searching packages:', error);
          setLocalPackages([]);
        } finally {
          setLoadingPackages(false);
        }
      };
      
      searchPackages();
    }
  }, [debouncedPackageSearch]);

  // Sync input value when package is selected from external value
  useEffect(() => {
    if (value && value.name !== packageSearchInput) {
      setPackageSearchInput(value.name);
    } else if (!value && packageSearchInput !== '') {
      setPackageSearchInput('');
    }
  }, [value, packageSearchInput]);

  // Initial search when component mounts
  useEffect(() => {
    // Trigger initial search for all packages
    const initialSearch = async () => {
      setLoadingPackages(true);
      try {
        const packages = await packageService.getPackagesForAutocomplete("", 15);
        setLocalPackages(packages);
      } catch (error) {
        console.error('Error loading initial packages:', error);
        setLocalPackages([]);
      } finally {
        setLoadingPackages(false);
      }
    };

    initialSearch();
  }, []);

  // Memoized handlers
  const handlePackageChange = useCallback((event: React.SyntheticEvent, newValue: Package | null) => {
    if (newValue) {
      onChange(newValue);
      setPackageSearchInput(newValue.name);
    } else {
      onChange(null);
      setPackageSearchInput("");
    }
  }, [onChange]);

  const handleInputChange = useCallback((event: React.SyntheticEvent, newInputValue: string) => {
    setPackageSearchInput(newInputValue);
    if (onInputChange) {
      onInputChange(newInputValue);
    }
  }, [onInputChange]);

  // Memoized package options
  const packageOptions = useMemo(() => {
    return localPackages;
  }, [localPackages]);

  return (
    <Box>
      <Autocomplete
        id={id}
        ref={autocompleteRef}
        options={packageOptions}
        getOptionLabel={(option) => option.name}
        value={value}
        onChange={handlePackageChange}
        onInputChange={handleInputChange}
        inputValue={currentInputValue}
        loading={loadingPackages}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        noOptionsText="لا توجد نتائج"
        disabled={disabled}
        freeSolo={true}
        clearOnBlur={true}
        selectOnFocus={true}
        blurOnSelect={true}
        filterOptions={(x) => x} // Disable client-side filtering since we're doing server-side search
        className={className}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label || 'اسم المجموعة'}
            error={error}
            helperText={helperText}
            size={size}
            required={required}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loadingPackages ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <li key={key} {...otherProps}>
              <PackageOption option={option} />
            </li>
          );
        }}
      />
    </Box>
  );
});

PackageAutocomplete.displayName = 'PackageAutocomplete';
