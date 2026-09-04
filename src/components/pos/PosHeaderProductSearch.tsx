// src/components/pos/PosHeaderProductSearch.tsx
import React, { useState } from "react";
import {
  Autocomplete,
  Box,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { useSettings } from "@/context/SettingsContext";
import { Product } from "@/services/productService";
import { formatNumber, CURRENCY_DECIMALS } from "@/constants";

interface PosHeaderProductSearchProps {
  /** Controlled text in the search box. */
  inputValue: string;
  onInputValueChange: (value: string) => void;
  /** Autocomplete option list. */
  options: Product[];
  /** Options are being fetched. */
  loading: boolean;
  /** Whole control is disabled (e.g. no active sale). */
  disabled: boolean;
  /** A product is currently being added to the sale. */
  addLoading: boolean;
  /** Free-text entry submitted with Enter (barcode / SKU). */
  onAddByBarcode: (barcode: string) => void;
  /** An option was picked from the list. */
  onSelectProduct: (product: Product) => void;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
}

export function PosHeaderProductSearch({
  inputValue,
  onInputValueChange,
  options,
  loading,
  disabled,
  addLoading,
  onAddByBarcode,
  onSelectProduct,
  inputRef,
}: PosHeaderProductSearchProps) {
  const { t } = useTranslation("pos");
  const { getSetting } = useSettings();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const hideExpiryDate = Boolean(getSetting("hide_expiry_date", false));
  const currencyCode = getSetting("currency_code", "SDG") as string;
  const currencyDecimals = CURRENCY_DECIMALS[currencyCode] ?? 0;

  return (
    <Box sx={{ flex: 1, minWidth: 160, maxWidth: 420 }}>
      <Autocomplete
        freeSolo
        value={selectedProduct}
        inputValue={inputValue}
        onInputChange={(_, value) => onInputValueChange(value)}
        onChange={(_, newValue: string | Product | null) => {
          if (typeof newValue === "string") {
            // This handles the "Enter" key on free text (barcode interaction)
            onAddByBarcode(newValue);
          } else if (newValue && typeof newValue === "object") {
            // This handles selecting an option from the list
            onSelectProduct(newValue);
            setSelectedProduct(null);
          }
        }}
        options={options}
        getOptionLabel={(opt) => {
          if (typeof opt === "string") return opt;
          const option = opt as Product;
          return option?.name
            ? `${option.name}${option.sale_price ? ` (${option.sale_price})` : ""}`
            : "";
        }}
        loading={loading}
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            inputRef={(el) => {
              inputRef.current = el;
              const prev = (
                params as { inputRef?: React.Ref<HTMLInputElement> }
              ).inputRef;
              if (typeof prev === "function") prev(el);
              else if (prev && typeof prev === "object")
                (
                  prev as React.MutableRefObject<HTMLInputElement | null>
                ).current = el;
            }}
            placeholder={t("searchProductOrBarcodePlaceholder")}
            size="small"
            slotProps={{
              htmlInput: {
                ...params.inputProps,
                dir: "ltr",
                style: { textAlign: "left" },
              },
              formHelperText: { sx: { color: "warning.main", mx: 0 } },
            }}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {addLoading ? (
                    <CircularProgress size={20} sx={{ mr: 1 }} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            helperText={
              inputValue.trim() && !loading && options.length === 0
                ? (() => {
                  const showExpired = getSetting("pos_show_expired_products", false);
                  const showOutOfStock = getSetting("pos_show_out_of_stock_products", false);
                  if (!showExpired && !showOutOfStock) return t("hiddenExpiredAndOutOfStockHelper");
                  if (!showExpired) return t("hiddenExpiredHelper");
                  if (!showOutOfStock) return t("hiddenOutOfStockHelper");
                  return t("noResultsText");
                })()
                : undefined
            }
          />
        )}
        renderOption={(props, opt) => {
          if (typeof opt === "string")
            return (
              <li {...props} key={opt}>
                {opt}
              </li>
            );
          const option = opt as Product;
          return (
            <li {...props} key={option.id}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.25,
                  width: "100%",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: "70%",
                    }}
                  >
                    {option.name}
                  </Typography>
                  {option.is_service ? (
                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                      خدمة
                    </Typography>
                  ) : option.current_stock_quantity != null ||
                    option.stock_quantity != null ? (
                    <Typography
                      variant="caption"
                      color={
                        (option.current_stock_quantity ??
                          option.stock_quantity ??
                          0) <= 5
                          ? "error.main"
                          : "success.main"
                      }
                      fontWeight="bold"
                    >
                      {`${t("quantityColonLabel")} ${formatNumber(
                        option.current_stock_quantity ??
                        option.stock_quantity ??
                        0,
                      )}`}
                    </Typography>
                  ) : null}
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  {option.last_sale_price_per_sellable_unit != null ? (
                    <Stack direction="row" spacing={0.4} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        {`${t("priceColonLabel")} ${formatNumber(Number(option.last_sale_price_per_sellable_unit), currencyDecimals)}`}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontSize: "0.6rem",
                          px: 0.5,
                          py: 0.1,
                          borderRadius: 0.75,
                          lineHeight: 1.6,
                          bgcolor: option.last_purchase_currency === "USD" ? "success.light" : "info.light",
                          color: option.last_purchase_currency === "USD" ? "success.dark" : "info.dark",
                        }}
                      >
                        {currencyCode === "OMR" ? "OMR" : (option.last_purchase_currency ?? currencyCode)}
                      </Typography>
                    </Stack>
                  ) : null}

                  {!hideExpiryDate && option.earliest_expiry_date && (
                    <Typography variant="caption" >
                      {`${t("expiresColonLabel")} ${option.earliest_expiry_date}`}
                    </Typography>
                  )}
                </Box>
              </Box>
            </li>
          );
        }}
        noOptionsText={
          inputValue.trim() ? t("noResultsText") : t("typeToSearchShort")
        }
        sx={{ width: "100%" }}
      />
    </Box>
  );
}

export default PosHeaderProductSearch;
