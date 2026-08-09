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
import { useTranslation, TFunction } from "react-i18next";

const buildReportFilterSchema = (t: TFunction) =>
  z
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
        message: t("reports:salesReportPage.endDateAfterStartDate"),
        path: ["endDate"],
      },
    );

export type ReportFilterValues = z.infer<ReturnType<typeof buildReportFilterSchema>>;

interface ReportFiltersProps {
  initialValues: ReportFilterValues;
  onFilterSubmit: (data: ReportFilterValues) => void;
  onClearFilters: () => void;
  clients: any[];
  users: any[];
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
  users,
  products,
  shifts,
  loadingFilters,
  posMode,
}) => {
  const { t } = useTranslation(["reports"]);
  const reportFilterSchema = React.useMemo(() => buildReportFilterSchema(t), [t]);
  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: initialValues,
  });

  const { control, handleSubmit, reset } = form;

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  const handleSubmitFilters = (data: ReportFilterValues) => {
    const toSubmit = { ...data };
    if (posMode === "days") {
      toSubmit.shiftId = null;
    }
    onFilterSubmit(toSubmit);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleSubmitFilters)}
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
                label={t("reports:salesReportPage.fromDateLabel")}
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
                label={t("reports:salesReportPage.toDateLabel")}
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
                    <TextField {...params} label={t("reports:salesReportPage.clientLabel")} size="small" />
                  )}
                  loading={loadingFilters}
                />
              )}
            />
          </Box>

          {/* User Select */}
          <Box sx={{ minWidth: 200 }}>
            <Controller
              control={control}
              name="userId"
              render={({ field }) => (
                <Autocomplete
                  options={users}
                  getOptionLabel={(option) => option.name || ""}
                  value={
                    users.find((u) => String(u.id) === field.value) || null
                  }
                  onChange={(_, newValue) => {
                    field.onChange(newValue ? String(newValue.id) : null);
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label={t("reports:salesReportPage.userLabel")} size="small" />
                  )}
                  loading={loadingFilters}
                />
              )}
            />
          </Box>

          {/* Shift Select */}
          {posMode === "shift" && (
            <Box sx={{ minWidth: 200 }}>
              <Controller
                control={control}
                name="shiftId"
                render={({ field }) => (
                  <Autocomplete
                    options={shifts}
                    getOptionLabel={(option) =>
                      option.name
                        ? `${option.name} ${
                            option.shift_date ? `(${option.shift_date})` : ""
                          }`
                        : t("reports:salesReportPage.shiftHash", {
                            id: option.id,
                            date: option.shift_date ? `(${option.shift_date})` : "",
                          })
                    }
                    value={
                      shifts.find((s) => String(s.id) === field.value) || null
                    }
                    onChange={(_, newValue) => {
                      field.onChange(newValue ? String(newValue.id) : null);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label={t("reports:salesReportPage.shiftLabel")} size="small" />
                    )}
                    loading={loadingFilters}
                  />
                )}
              />
            </Box>
          )}

          {/* Filter Actions */}
          <Stack direction="row" gap={1} spacing={1} sx={{ minWidth: 200 }}>
            <Button
              fullWidth
              variant="contained"
              type="submit"
              startIcon={<Filter size={18} />}
              sx={{ borderRadius: 2 }}
            >
              {t("reports:salesReportPage.searchButton")}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={onClearFilters}
              startIcon={<X size={18} />}
              sx={{ borderRadius: 2 }}
            >
              {t("reports:salesReportPage.clearButton")}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default ReportFilters;
