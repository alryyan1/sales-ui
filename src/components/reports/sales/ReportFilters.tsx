import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as z from "zod";
import apiClient from "@/lib/axios";
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
import { useTranslation } from "react-i18next";

const buildReportFilterSchema = (t: (key: string) => string) =>
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
        message: t("endDateAfterStartDateValidation"),
        path: ["endDate"],
      },
    );

export type ReportFilterValues = z.infer<ReturnType<typeof buildReportFilterSchema>>;

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
  const { t } = useTranslation("reports");
  const { t: tCommon } = useTranslation("common");
  const reportFilterSchema = useMemo(() => buildReportFilterSchema(t), [t]);

  const form = useForm<ReportFilterValues>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: initialValues,
  });

  const { control, handleSubmit, reset, watch, setValue } = form;

  const selectedShiftId = watch("shiftId");
  const dateInputsDisabled = posMode === "shift" && !!selectedShiftId;
  const scopedShiftId = posMode === "shift" ? selectedShiftId : null;

  // Users list — scoped to the selected shift so only users who recorded a
  // payment in that shift are offered.
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users-list-filters", scopedShiftId ?? null],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: number; name: string }[] }>(
        "/users/list",
        { params: scopedShiftId ? { shift_id: scopedShiftId } : {} },
      );
      return res.data?.data ?? [];
    },
  });

  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  // Drop a selected user that is no longer valid for the current shift scope.
  useEffect(() => {
    const currentUserId = form.getValues("userId");
    if (
      currentUserId &&
      !loadingUsers &&
      !users.some((u) => String(u.id) === currentUserId)
    ) {
      setValue("userId", null);
    }
  }, [users, loadingUsers, form, setValue]);

  const handleSubmitFilters = (data: ReportFilterValues) => {
    const toSubmit = { ...data };
    if (posMode === "days") {
      toSubmit.shiftId = null;
    } else if (toSubmit.shiftId) {
      // A shift already defines its own date range — don't also constrain by dates.
      toSubmit.startDate = null;
      toSubmit.endDate = null;
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
                label={t("startDateLabel")}
                disabled={dateInputsDisabled}
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
                label={t("endDateLabel")}
                disabled={dateInputsDisabled}
                InputLabelProps={{ shrink: true }}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
              />
            )}
          />
   {/* Shift Select */}
          {posMode === "shift" && (
            <Box sx={{ minWidth: 320 }}>
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
                        : `${t("shiftNumberFallback", { id: option.id })} ${
                            option.shift_date ? `(${option.shift_date})` : ""
                          }`
                    }
                    value={
                      shifts.find((s) => String(s.id) === field.value) || null
                    }
                    onChange={(_, newValue) => {
                      field.onChange(newValue ? String(newValue.id) : null);
                    }}
                    renderInput={(params) => (
                      <TextField {...params} label={t("shiftLabel")} size="small" />
                    )}
                    loading={loadingFilters}
                  />
                )}
              />
            </Box>
          )}

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
                    <TextField {...params} label={t("clientLabel")} size="small" />
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
                    <TextField {...params} label={t("user")} size="small" />
                  )}
                  loading={loadingFilters || loadingUsers}
                  noOptionsText={
                    scopedShiftId ? t("noUsersForShift") : undefined
                  }
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
              {tCommon("search")}
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="inherit"
              onClick={onClearFilters}
              startIcon={<X size={18} />}
              sx={{ borderRadius: 2 }}
            >
              {tCommon("clear")}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};

export default ReportFilters;
