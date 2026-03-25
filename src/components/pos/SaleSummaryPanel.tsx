import React from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Autocomplete,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Button,
  createFilterOptions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckIcon from "@mui/icons-material/Check";
import { Sale, Payment } from "@/services/saleService";
import { Client } from "@/services/clientService";
import dayjs from "dayjs";

export interface ClientOptionType extends Partial<Client> {
  inputValue?: string;
}

const filter = createFilterOptions<ClientOptionType>();

interface SaleSummaryPanelProps {
  selectedSale: Sale | null;
  clientOptions: Client[];
  clientInputValue: string;
  setClientInputValue: (val: string) => void;
  setInitialClientName: (val: string) => void;
  setIsClientModalOpen: (open: boolean) => void;
  handleClientChange: (client: Client | null) => void;
  clientSearchLoading: boolean;
  formatNumber: (n: number) => string;
  discountType: "percentage" | "fixed";
  setDiscountType: (type: "percentage" | "fixed") => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  handleApplyDiscount: () => void;
  discountLoading: boolean;
  handleRemoveDiscount: () => void;
  handleDeletePayment: (id: number) => void;
  deletingPaymentId: number | null;
  newPaymentMethod: Payment["method"];
  setNewPaymentMethod: (method: Payment["method"]) => void;
  newPaymentAmount: string;
  setNewPaymentAmount: (amount: string) => void;
  handleAddPayment: () => void;
  addPaymentLoading: boolean;
  thermalPdfLoading: boolean;
  handlePrintThermalInvoice: () => void;
  a4PdfLoading: boolean;
  handlePrintA4Invoice: () => void;
  fullPaymentLoading: boolean;
  handleFullPayment: () => void;
}

export const SaleSummaryPanel: React.FC<SaleSummaryPanelProps> = ({
  selectedSale,
  clientOptions,
  clientInputValue,
  setClientInputValue,
  setInitialClientName,
  setIsClientModalOpen,
  handleClientChange,
  clientSearchLoading,
  formatNumber,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  handleApplyDiscount,
  discountLoading,
  handleRemoveDiscount,
  handleDeletePayment,
  deletingPaymentId,
  newPaymentMethod,
  setNewPaymentMethod,
  newPaymentAmount,
  setNewPaymentAmount,
  handleAddPayment,
  addPaymentLoading,
  thermalPdfLoading,
  handlePrintThermalInvoice,
  a4PdfLoading,
  handlePrintA4Invoice,
  fullPaymentLoading,
  handleFullPayment,
}) => {
  console.log(selectedSale,'selectdSale');
  return (
    <Box
      sx={{
        width: { xs: "100%", md: 320 },
        flexShrink: 0,
      }}
    >
      <Paper
        sx={{
          height: "100%",
          overflow: "auto",
          p: 2,
          borderRadius: 2,
        }}
      >
        {selectedSale ? (
          <Box>
            <Stack
              direction={"column"}
              gap={1}
              alignItems={"center"}
              justifyContent={"space-between"}
            >
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                تفاصيل البيع #{selectedSale.id}
              </Typography>
              <Typography>{selectedSale.user?.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  تاريخ الفاتوره :   {selectedSale.sale_date}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  تاريخ الانشاء  : {selectedSale.created_at ? dayjs(selectedSale.created_at.replace("Z", "")).format("YYYY-MM-DD HH:mm A") : ""}
                </Typography>

            </Stack>

            <Autocomplete
              size="small"
              options={clientOptions as ClientOptionType[]}
              getOptionLabel={(option) => {
                if (typeof option === "string") {
                  return option;
                }
                if (option.inputValue) {
                  return option.inputValue;
                }
                return option.name || "";
              }}
              filterOptions={(options, params) => {
                const filtered = filter(options, params);

                const { inputValue } = params;
                const isExisting = options.some(
                  (option) => inputValue === option.name
                );
                if (inputValue !== "" && !isExisting) {
                  filtered.push({
                    inputValue,
                    name: `إضافة "${inputValue}"`,
                  });
                }

                return filtered;
              }}
              inputValue={clientInputValue}
              onInputChange={(_, value) => setClientInputValue(value)}
              value={
                selectedSale.client ||
                (selectedSale.client_name
                  ? ({
                      id: selectedSale.client_id,
                      name: selectedSale.client_name,
                    } as Client)
                  : null)
              }
              onChange={(_, newValue) => {
                if (typeof newValue === "string") {
                  setInitialClientName(newValue);
                  setIsClientModalOpen(true);
                } else if (newValue && newValue.inputValue) {
                  setInitialClientName(newValue.inputValue);
                  setIsClientModalOpen(true);
                } else {
                  handleClientChange(newValue as Client | null);
                }
              }}
              renderOption={(props, option) => {
                const { key, ...optionProps } = props;
                return (
                  <li key={key} {...optionProps}>
                    {option.name}
                  </li>
                );
              }}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={clientSearchLoading}
              disabled={!selectedSale}
              freeSolo
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              disableClearable={
                (selectedSale?.payments?.length ?? 0) > 0 &&
                !!(selectedSale?.client || selectedSale?.client_name)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="اختر عميل / زبون..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {clientSearchLoading ? (
                          <CircularProgress color="inherit" size={20} />
                        ) : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
              sx={{
                mb: selectedSale.client || selectedSale.client_name ? 1 : 2,
              }}
              noOptionsText={
                clientInputValue.trim() ? "لا توجد نتائج" : "اكتب للبحث"
              }
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {(() => {
                const subtotal =
                  selectedSale.subtotal != null
                    ? Number(selectedSale.subtotal)
                    : (selectedSale.items ?? []).reduce(
                        (sum, i) => sum + Number(i.total_price ?? 0),
                        0
                      );
                const discountAmt = Number(selectedSale.discount_amount ?? 0);
                return (
                  <>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="body2" color="text.secondary">
                        المجموع الفرعي
                      </Typography>
                      <Typography variant="body1" fontWeight={700}>
                        {formatNumber(subtotal)}
                      </Typography>
                    </Box>
                    {discountAmt > 0 && (
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="body2" color="text.secondary">
                          الخصم
                        </Typography>
                        <Typography variant="body1" fontWeight={700} color="error.main">
                          - {formatNumber(discountAmt)}
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 0.75,
                        mt: 0.5,
                      }}
                    >
                      <FormControl size="small" sx={{ minWidth: 90 }}>
                        <InputLabel id="discount-type-label">نوع الخصم</InputLabel>
                        <Select
                          labelId="discount-type-label"
                          value={discountType}
                          label="نوع الخصم"
                          onChange={(e) =>
                            setDiscountType(
                              e.target.value as "percentage" | "fixed"
                            )
                          }
                        >
                          <MenuItem value="fixed">مبلغ ثابت</MenuItem>
                          <MenuItem value="percentage">نسبة مئوية</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        type="number"
                        placeholder={discountType === "percentage" ? "٪" : "المبلغ"}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        inputProps={{
                          min: 0,
                          max: discountType === "percentage" ? 100 : undefined,
                          step: discountType === "percentage" ? 1 : 0.01,
                        }}
                        sx={{
                          width: 110,
                          "& .MuiInputBase-input": {
                            fontSize: "1.1rem",
                            fontWeight: 700,
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        color="success"
                        onClick={handleApplyDiscount}
                        disabled={
                          discountLoading ||
                          !discountValue.trim() ||
                          (selectedSale.items?.length ?? 0) === 0 ||
                          (selectedSale.payments?.length ?? 0) > 0
                        }
                        aria-label="تطبيق الخصم"
                      >
                        {discountLoading ? (
                          <CircularProgress size={20} color="inherit" />
                        ) : (
                          <CheckIcon />
                        )}
                      </IconButton>
                      {discountAmt > 0 && (
                        <Button
                          size="small"
                          variant="text"
                          color="error"
                          onClick={handleRemoveDiscount}
                          disabled={
                            discountLoading ||
                            (selectedSale.payments?.length ?? 0) > 0
                          }
                        >
                          إلغاء الخصم
                        </Button>
                      )}
                    </Box>
                  </>
                );
              })()}
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  الإجمالي
                </Typography>
                <Typography variant="body1" fontWeight={800} color="success.main">
                  {formatNumber(Number(selectedSale.total_amount ?? 0))}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" color="text.secondary">
                  المدفوع
                </Typography>
                <Typography variant="body1" fontWeight={700}>
                  {formatNumber(Number(selectedSale.paid_amount ?? 0))}
                </Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="body1" color="text.secondary">
                  المتبقي
                </Typography>
                <Typography variant="body1" fontWeight={800} color="error.dark">
                  {formatNumber(
                    selectedSale.due_amount != null
                      ? Number(selectedSale.due_amount)
                      : Math.max(
                          0,
                          Number(selectedSale.total_amount ?? 0) -
                            Number(selectedSale.paid_amount ?? 0)
                        )
                  )}
                </Typography>
              </Box>
            </Box>
            {selectedSale.payments && selectedSale.payments.length > 0 && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ display: "block", mb: 0.75 }}
                >
                  المدفوعات
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {selectedSale.payments.map((p) => (
                    <Box
                      key={p.id ?? `${p.method}-${p.amount}-${p.payment_date}`}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        py: 0.5,
                        px: 1,
                        borderRadius: 1,
                        bgcolor: "action.hover",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {p.method === "cash"
                          ? "نقدي"
                          : p.method === "bankak"
                          ? "بنكك"
                          : p.method === "fawry"
                          ? "فوري"
                          : p.method === "ocash"
                          ? "أوكاش"
                          : p.method}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>
                          {formatNumber(Number(p.amount))}
                        </Typography>
                        {p.id != null && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePayment(p.id!)}
                            disabled={deletingPaymentId === p.id}
                            sx={{ p: 0.25 }}
                            aria-label="حذف الدفعة"
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {(() => {
              const due =
                selectedSale.due_amount != null
                  ? Number(selectedSale.due_amount)
                  : Math.max(
                      0,
                      Number(selectedSale.total_amount ?? 0) -
                        Number(selectedSale.paid_amount ?? 0)
                    );
              const notFullyPaid = due > 0;
              return notFullyPaid ? (
                <Box sx={{ mt: 1.5 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ display: "block", mb: 0.75 }}
                  >
                    إضافة دفعة
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 0.75,
                    }}
                  >
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                      <InputLabel id="new-payment-method-label">طريقة</InputLabel>
                      <Select
                        labelId="new-payment-method-label"
                        value={newPaymentMethod}
                        label="طريقة"
                        onChange={(e) =>
                          setNewPaymentMethod(e.target.value as Payment["method"])
                        }
                      >
                        <MenuItem value="cash">نقدي</MenuItem>
                        <MenuItem value="bankak">بنكك</MenuItem>
                        <MenuItem value="fawry">فوري</MenuItem>
                        <MenuItem value="ocash">أوكاش</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      type="number"
                      placeholder="المبلغ"
                      value={newPaymentAmount}
                      onFocus={(e) => {
                        e.target.select();
                      }}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      inputProps={{ min: 0.01, step: 0.01 }}
                      sx={{
                        width: 120,
                        "& .MuiInputBase-input": {
                          fontSize: "1.2rem",
                          fontWeight: 800,
                        },
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddPayment();
                        else if (e.key === "+") {
                          e.preventDefault();
                          handleAddPayment();
                        }
                      }}
                    />
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={handleAddPayment}
                      disabled={addPaymentLoading || !newPaymentAmount.trim()}
                      aria-label="إضافة دفعة"
                    >
                      {addPaymentLoading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <AddIcon />
                      )}
                    </IconButton>
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.5 }}
                  >
                    المتبقي:{" "}
                    <Box
                      component="span"
                      sx={{
                        fontSize: "1.1rem",
                        fontWeight: 800,
                        color: "error.main",
                      }}
                    >
                      {formatNumber(due)}
                    </Box>
                  </Typography>
                </Box>
              ) : null;
            })()}
            {selectedSale.notes && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1.5, display: "block" }}
              >
                {selectedSale.notes}
              </Typography>
            )}
            <Stack direction="row" spacing={1} alignItems={"center"} gap={1} sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                disabled={thermalPdfLoading}
                sx={{ textTransform: "none" }}
                onClick={handlePrintThermalInvoice}
              >
                {thermalPdfLoading ? "جاري التحميل..." : "طباعة فاتورة"}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                disabled={a4PdfLoading || !selectedSale?.client_id}
                sx={{ textTransform: "none" }}
                onClick={handlePrintA4Invoice}
              >
                {a4PdfLoading ? "جاري التحميل..." : "فاتورة A4 PDF"}
              </Button>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              size="small"
              disabled={
                fullPaymentLoading ||
                (selectedSale.due_amount != null
                  ? Number(selectedSale.due_amount) <= 0
                  : Number(selectedSale.total_amount ?? 0) -
                      Number(selectedSale.paid_amount ?? 0) <=
                    0)
              }
              sx={{ mt: 1, textTransform: "none" }}
              onClick={handleFullPayment}
            >
              {fullPaymentLoading ? "جاري التسديد..." : "تسديد كامل"}
            </Button>
          </Box>
        ) : (
          <Typography variant="subtitle2" color="text.secondary">
            Column 3
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
