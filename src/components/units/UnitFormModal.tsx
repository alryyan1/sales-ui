import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  Alert,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import unitService, { Unit, UnitFormData } from "../../services/UnitService";
import { useTranslation } from "react-i18next";

interface UnitFormModalProps {
  open: boolean;
  onClose: () => void;
  unit: Unit | null;
  onSuccess: () => void;
}

const UnitFormModal: React.FC<UnitFormModalProps> = ({
  open,
  onClose,
  unit,
  onSuccess,
}) => {
  const { t } = useTranslation(["units"]);
  const [formData, setFormData] = useState<UnitFormData>({
    name: "",
    description: "",
    is_active: true,
    is_default: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name,
        description: unit.description || "",
        is_active: unit.is_active,
        is_default: unit.is_default,
      });
    } else {
      setFormData({
        name: "",
        description: "",
        is_active: true,
        is_default: false,
      });
    }
    setError(null);
  }, [unit, open]);

  const createMutation = useMutation({
    mutationFn: (data: UnitFormData) => unitService.createUnit(data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      setError(error.message || "Failed to create unit");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UnitFormData) => unitService.updateUnit(unit!.id, data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: any) => {
      setError(error.message || "Failed to update unit");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    if (unit) {
      await updateMutation.mutateAsync(formData);
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleChange = (field: keyof UnitFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{unit ? t("units:editTitle") : t("units:createTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label={t("units:name")}
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              fullWidth
              autoFocus
              variant="outlined"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_default}
                  onChange={(e) => handleChange("is_default", e.target.checked)}
                  color="primary"
                />
              }
              label={t("units:setAsDefault")}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isLoading} variant="outlined" color="inherit">
            {t("units:cancel")}
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ minWidth: 100 }}>
            {isLoading ? t("units:savingEllipsis") : unit ? t("units:update") : t("units:save")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UnitFormModal;
