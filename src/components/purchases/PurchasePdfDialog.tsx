import React from "react";
import { Dialog, DialogContent } from "@mui/material";
import { PDFViewer } from "@react-pdf/renderer";
import { Purchase, PurchaseItem } from "@/services/purchaseService";
import { useSettings } from "@/context/SettingsContext";
import { PurchasePdf } from "./PurchasePdf";

interface PurchasePdfDialogProps {
  open: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  items: PurchaseItem[];
}

export const PurchasePdfDialog: React.FC<PurchasePdfDialogProps> = ({
  open,
  onClose,
  purchase,
  items,
}) => {
  const { settings } = useSettings();

  if (!purchase) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogContent sx={{ height: "90vh", p: 0 }}>
        <PDFViewer width="100%" height="100%" showToolbar={true}>
          <PurchasePdf purchase={purchase} items={items} settings={settings} />
        </PDFViewer>
      </DialogContent>
    </Dialog>
  );
};
