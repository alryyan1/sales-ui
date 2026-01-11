import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Autocomplete,
} from "@mui/material";
import { Filter, X } from "lucide-react";

export const reportFilterSchema = z
  .object({
    startDate: z.string().nullable().optional(),
    endDate: z.string().nullable().optional(),
    clientId: z.string().nullable().optional(),
    userId: z.string().nullable().optional(),
    shiftId: z.string().nullable().optional(),
    productId: z.string().nullable().optional(),
  })
  .refine(
    (data) =>
      !data.endDate || !data.startDate || data.endDate >= data.startDate,
    {
      message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
      path: ["endDate"],
    }
  );

export type ReportFilterValues = z.infer<typeof reportFilterSchema>;

interface ReportFiltersProps {
  initialValues: ReportFilterValues;
  onFilterSubmit: (data: ReportFilterValues) => void;
  onClearFilters: () => void;
  clients: any[];
  products: any[];
  shifts: any[];
  loadingFilters: boolean;
  posMode: "shift" | "days";
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  initialValues,
  onFilterSubmit,
  onClearFilters,
  clients,
  products,
  shifts,
  loadingFilters,
  posMode,
}) => {
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: initialValues,
  });

  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onFilterSubmit)}
      sx={{
        p: 3,
        bgcolor: "background.paper",
        borderRadius: 3,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        mb: 3,
      }}
    >
      <Stack spacing={3}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(6, 1fr)",
            },
            gap: 2,
            alignItems: "flex-end",
          }}
        >
          {/* Start Date */}
          <Controller
            control={control}
            name="startDate"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                type="date"
                label="من تاريخ"
                InputLabelProps={{ shrink: true }}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          {/* End Date */}
          <Controller
            control={control}
            name="endDate"
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                fullWidth
                size="small"
                type="date"
                label="إلى تاريخ"
                InputLabelProps={{ shrink: true }}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />

          {/* Client Select */}
          <Box sx={{ minWidth: 200 }}>
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Autocomplete
                  options={clients}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    clients.find((c) => String(c.id) === field.value) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue ? String(newValue.id) : null);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="العميل" size="small" />
                  )}
                  loading={loadingFilters}
                />
              )}
            />
          </Box>

          {/* Shift Select */}
          {posMode === "shift" && (
            <Box sx={{ minWidth: 150 }}>
              <Controller
                control={control}
                name="shiftId"
                render={({ field, fieldState }) => (
                  <FormControl
                    fullWidth
                    size="small"
                    error={!!fieldState.error}
                  >
                    <InputLabel>الوردية</InputLabel>
                    <Select
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      label="الوردية"
                      disabled={loadingFilters}
                    >
                      <MenuItem value="">الكل</MenuItem>
                      {shifts.map((shift) => (
                        <MenuItem key={shift.id} value={String(shift.id)}>
                          {shift.name || `الوردية #${shift.id}`}{" "}
                          {shift.shift_date ? `(${shift.shift_date})` : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Box>
          )}

          {/* Product Select */}
          <Box sx={{ minWidth: 200 }}>
            <Controller
              control={control}
              name="productId"
              render={({ field }) => (
                <Autocomplete
                  options={products}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    products.find((p) => String(p.id) === field.value) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue ? String(newValue.id) : null);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="المنتج" size="small" />
                  )}
                  loading={loadingFilters}
                />
              )}
            />
          </Box>

          {/* Filter Actions */}
          <Stack direction="row" gap={1} spacing={1} sx={{ minWidth: 200 }}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              startIcon={<Filter size={18} />}
              sx={{ borderRadius: 2 }}
            >
              تصفية
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={onClearFilters}
              startIcon={<X size={18} />}
              sx={{ borderRadius: 2 }}
            >
              مسح
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default ReportFilters;
