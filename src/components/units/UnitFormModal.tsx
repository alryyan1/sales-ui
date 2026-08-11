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
  const [formData, setFormData] = useState<UnitFormData>({
    name: "",
    name_en: "",
    description: "",
    is_active: true,
    is_default: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name,
        name_en: unit.name_en || "",
        description: unit.description || "",
        is_active: unit.is_active,
        is_default: unit.is_default,
      });
    } else {
      setFormData({
        name: "",
        name_en: "",
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
        <DialogTitle>{unit ? "تعديل وحدة" : "إضافة وحدة جديدة"}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="اسم الوحدة"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              fullWidth
              autoFocus
              variant="outlined"
            />

            <TextField
              label="الاسم بالإنجليزية (English Name)"
              value={formData.name_en ?? ""}
              onChange={(e) => handleChange("name_en", e.target.value)}
              fullWidth
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
              label="تعيين كافتراضي"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isLoading} variant="outlined" color="inherit">
            إلغاء
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading} sx={{ minWidth: 100 }}>
            {isLoading ? "جاري الحفظ..." : unit ? "تحديث" : "حفظ"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UnitFormModal;
