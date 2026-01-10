import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  IconButton,
} from "@mui/material";
import { X } from "lucide-react";
import { PDFViewer } from "@react-pdf/renderer";
import { PosShiftReportPdf } from "@/components/pos/PosShiftReportPdf";
import { Sale } from "@/services/saleService";
import { AppSettings } from "@/services/settingService";

export interface ShiftInfo {
  id: number;
  opened_at: string | null;
  closed_at: string | null;
  is_open: boolean;
  name?: string;
  shift_date?: string;
}

interface ShiftReportDialogProps {
  open: boolean;
  onClose: () => void;
  reportData: { data: Sale[] } | undefined;
  shift: ShiftInfo | null;
  settings: AppSettings | null;
}

export const ShiftReportDialog: React.FC<ShiftReportDialogProps> = ({
  open,
  onClose,
  reportData,
  shift,
  settings,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      dir="rtl"
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: "90vh",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 2,
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          تقرير الوردية #{shift?.id}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{ p: 0, height: "calc(90vh - 64px)", overflow: "hidden" }}
      >
        {reportData && reportData.data.length > 0 && shift && (
          <PDFViewer width="100%" height="100%" showToolbar={true}>
            <PosShiftReportPdf
              sales={reportData.data}
              shift={shift}
              userName={reportData.data[0]?.user_name || undefined}
              settings={settings}
            />
          </PDFViewer>
        )}
      </DialogContent>
    </Dialog>
  );
};
