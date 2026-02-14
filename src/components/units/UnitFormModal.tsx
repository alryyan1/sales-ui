import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
    type: "sellable",
    description: "",
    is_active: true,
    is_default: false,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (unit) {
      setFormData({
        name: unit.name,
        type: unit.type,
        description: unit.description || "",
        is_active: unit.is_active,
        is_default: unit.is_default,
      });
    } else {
      setFormData({
        name: "",
        type: "sellable",
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{unit ? "Edit Unit" : "Add New Unit"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              fullWidth
              autoFocus
            />

            <FormControl fullWidth required>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                onChange={(e) => handleChange("type", e.target.value)}
              >
                <MenuItem value="sellable">Sellable</MenuItem>
                <MenuItem value="stocking">Stocking</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              multiline
              rows={3}
              fullWidth
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                />
              }
              label="Active"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_default}
                  onChange={(e) => handleChange("is_default", e.target.checked)}
                />
              }
              label="Set as Default"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading ? "Saving..." : unit ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default UnitFormModal;
