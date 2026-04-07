// src/components/purchases/PurchaseHeaderFormSection.tsx
import React from "react";
import { useFormContext, Controller } from "react-hook-form";

// MUI Components
import {
  Card,
  CardContent,
  TextField,
  Autocomplete,
  CircularProgress,
  Box,
  Typography,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

// Icons
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";

// Types
import { Supplier } from "../../services/supplierService";
import { Warehouse } from "../../services/warehouseService";

interface PurchaseHeaderFormSectionProps {
  suppliers: Supplier[];
  loadingSuppliers: boolean;
  supplierSearchInput: string;
  onSupplierSearchInputChange: (value: string) => void;
  isSubmitting: boolean;
  selectedSupplier: Supplier | null;
  onSupplierSelect: (supplier: Supplier | null) => void;
  isPurchaseReceived?: boolean;
  warehouses?: Warehouse[];
  loadingWarehouses?: boolean;
  isEditMode?: boolean;
}

// Field Label Component with Icon
const FieldLabel: React.FC<{
  children: React.ReactNode;
  required?: boolean;
  icon?: React.ReactNode;
}> = ({ children, required, icon }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
    {icon && (
      <Box
        sx={{
          color: "primary.main",
          display: "flex",
          alignItems: "center",
          "& svg": { fontSize: 18 },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography
      variant="body2"
      sx={{
        fontWeight: 600,
        color: "text.primary",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
      {required && (
        <Typography component="span" sx={{ color: "error.main", ml: 0.5 }}>
          *
        </Typography>
      )}
    </Typography>
  </Box>
);

export const PurchaseHeaderFormSection: React.FC<
  PurchaseHeaderFormSectionProps
> = ({
  suppliers,
  loadingSuppliers,
  supplierSearchInput,
  onSupplierSearchInputChange,
  isSubmitting,
  selectedSupplier,
  onSupplierSelect,
  isPurchaseReceived = false,
  warehouses,
  loadingWarehouses,
}) => {
  const { control } = useFormContext();

  const inputStyles = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "background.paper",
      transition: "all 0.2s ease-in-out",
      "&:hover": {
        backgroundColor: (theme: any) =>
          alpha(theme.palette.primary.main, 0.02),
      },
      "&.Mui-focused": {
        backgroundColor: "background.paper",
        boxShadow: (theme: any) =>
          `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
      },
      "& input, & textarea": {
        textAlign: "right",
        direction: "ltr",
      },
    },
  };

  const isDisabled = isSubmitting || isPurchaseReceived;

  return (
    <Card
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        mb: 3,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <InventoryOutlinedIcon sx={{ fontSize: 22, color: "primary.main" }} />
          معلومات الطلب
        </Typography>
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            direction: "ltr",
            "& > *": {
              flex: {
                xs: "1 1 100%",
                md: "1 1 calc(33.333% - 16px)",
              },
              minWidth: { xs: "100%", sm: 200, md: 150 },
            },
          }}
        >
          {/* Warehouse Selection */}
          <Controller
            control={control}
            name="warehouse_id"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel required icon={<InventoryOutlinedIcon />}>
                  المخزن
                </FieldLabel>
                <Autocomplete
                  options={warehouses || []}
                  getOptionLabel={(option) => option.name}
                  value={
                    warehouses?.find((w) => w.id === field.value) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id);
                  }}
                  loading={loadingWarehouses}
                  disabled={isSubmitting || isPurchaseReceived}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="اختر المخزن"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      size="small"
                    />
                  )}
                />
              </Box>
            )}
          />

          {/* Supplier Selection */}
          <Controller
            control={control}
            name="supplier_id"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel required icon={<LocalShippingOutlinedIcon />}>
                  المورد
                </FieldLabel>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => option.name}
                  value={selectedSupplier}
                  onChange={(_, newValue) => {
                    field.onChange(newValue?.id || "");
                    onSupplierSelect(newValue);
                  }}
                  onInputChange={(_, newInputValue) =>
                    onSupplierSearchInputChange(newInputValue)
                  }
                  inputValue={supplierSearchInput}
                  loading={loadingSuppliers}
                  disabled={isDisabled}
                  size="small"
                  noOptionsText="لا توجد نتائج"
                  loadingText="جاري البحث..."
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="ابحث عن مورد..."
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={inputStyles}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {loadingSuppliers && (
                              <CircularProgress color="primary" size={18} />
                            )}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box
                      component="li"
                      {...props}
                      sx={{
                        direction: "ltr",
                        textAlign: "right",
                        py: 1.5,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        "&:last-child": { borderBottom: "none" },
                      }}
                    >
                      <Typography variant="body2" fontWeight={500}>
                        {option.name}
                      </Typography>
                    </Box>
                  )}
                />
              </Box>
            )}
          />

          {/* Purchase Date */}
          <Controller
            control={control}
            name="purchase_date"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel required icon={<CalendarTodayOutlinedIcon />}>
                  تاريخ الطلب
                </FieldLabel>
                <DatePicker
                  value={field.value ?? null}
                  onChange={field.onChange}
                  disabled={isDisabled}
                  slotProps={{
                    textField: {
                      size: "small",
                      fullWidth: true,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message,
                      placeholder: "YYYY/MM/DD",
                      sx: inputStyles,
                    },
                  }}
                  shouldDisableDate={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                />
              </Box>
            )}
          />

          {/* Currency */}
          <Controller
            control={control}
            name="currency"
            render={({ field, fieldState }) => (
              <Box>
                <FieldLabel required icon={<CurrencyExchangeIcon />}>
                  العملة
                </FieldLabel>
                <FormControl size="small" fullWidth error={!!fieldState.error}>
                  <Select
                    value={field.value ?? "SDG"}
                    onChange={field.onChange}
                    disabled={isDisabled}
                    sx={inputStyles}
                  >
                    <MenuItem value="SDG">SDG — جنيه سوداني</MenuItem>
                    <MenuItem value="USD">USD — دولار أمريكي</MenuItem>
                  </Select>
                  {fieldState.error && (
                    <Typography variant="caption" color="error" sx={{ mt: 0.5, mx: 1.75 }}>
                      {fieldState.error.message}
                    </Typography>
                  )}
                </FormControl>
              </Box>
            )}
          />
        </Box>
      </CardContent>
    </Card>
  );
};
