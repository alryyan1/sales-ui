import React from "react";
import { Dialog, DialogContent, DialogTitle, IconButton, Box } from "@mui/material";
import { PDFViewer } from "@react-pdf/renderer";
import { X } from "lucide-react";
import { Sale } from "@/services/saleService";
import { SalesWithDiscountsPdf } from "./SalesWithDiscountsPdf";

interface SalesWithDiscountsPdfDialogProps {
  open: boolean;
  onClose: () => void;
  sales: Sale[];
  startDate: string;
  endDate: string;
  totals: {
    totalAmount: number;
    totalPaid: number;
    totalDiscount: number;
    totalDue: number;
  };
}

export const SalesWithDiscountsPdfDialog: React.FC<
  SalesWithDiscountsPdfDialogProps
> = ({ open, onClose, sales, startDate, endDate, totals }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          width: "95vw",
          maxWidth: "1200px",
          height: "90vh",
          maxHeight: "90vh",
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
            }}
          >
            تقرير المبيعات المخفضة
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ height: "100%", p: 0, overflow: "hidden" }}>
        <PDFViewer width="100%" height="100%" showToolbar={true}>
          <SalesWithDiscountsPdf
            sales={sales}
            startDate={startDate}
            endDate={endDate}
            totals={totals}
          />
        </PDFViewer>
      </DialogContent>
    </Dialog>
  );
};

