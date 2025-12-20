import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Box,
  Typography,
} from "@mui/material";
import { Warehouse } from "../../services/warehouseService";

interface WarehouseFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Warehouse>) => Promise<void>;
  initialData?: Warehouse | null;
}

const WarehouseFormDialog: React.FC<WarehouseFormDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAddress(initialData.address || "");
      setContactInfo(initialData.contact_info || "");
      setHeaderText(initialData.header_text || "");
      setFooterText(initialData.footer_text || "");
      setIsActive(initialData.is_active);
    } else {
      setName("");
      setAddress("");
      setContactInfo("");
      setHeaderText("");
      setFooterText("");
      setIsActive(true);
    }
    setErrors({});
  }, [initialData, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Warehouse Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await onSave({
        name,
        address,
        contact_info: contactInfo,
        header_text: headerText,
        footer_text: footerText,
        is_active: isActive,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save warehouse:", error);
      // Handle server errors if needed
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initialData ? "Edit Warehouse" : "Add New Warehouse"}
      </DialogTitle>
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={2} mt={1}>
          <TextField
            label="Warehouse Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
          />
          <TextField
            label="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Contact Info"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            fullWidth
          />

          <Typography variant="subtitle2" color="primary" sx={{ mt: 1 }}>
            Invoice Settings (Optional)
          </Typography>
          <TextField
            label="Invoice Header Text"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            fullWidth
            multiline
            rows={2}
            helperText="Text to appear at the top of invoices from this warehouse."
          />
          <TextField
            label="Invoice Footer Text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            fullWidth
            multiline
            rows={2}
            helperText="Text to appear at the bottom of invoices."
          />

          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="primary"
              />
            }
            label="Active"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WarehouseFormDialog;
