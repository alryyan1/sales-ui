import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    IconButton,
} from "@mui/material";
import { PDFViewer } from "@react-pdf/renderer";
import { Close as CloseIcon, Print as PrintIcon } from "@mui/icons-material";
import { OfflineSale } from "../../services/db";
import { PosInvoicePdf } from "./PosInvoicePdf";
import settingService from "@/services/settingService";

interface OfflineThermalInvoiceDialogProps {
    open: boolean;
    onClose: () => void;
    sale: OfflineSale | null;
}

export const OfflineThermalInvoiceDialog: React.FC<OfflineThermalInvoiceDialogProps> = ({
    open,
    onClose,
    sale,
}) => {
    if (!sale) return null;

    const settings = settingService.getSettings();

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={false}
            PaperProps={{
                sx: {
                    width: "350px", // Slightly wider for PDF viewer controls
                    height: "90vh",
                    maxHeight: "90vh",
                    maxWidth: "100%",
                },
            }}
        >
            <DialogTitle>
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Typography variant="h6">
                        فاتورة {sale.sale_order_number || sale.tempId}
                    </Typography>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 0, height: "100%", overflow: "hidden" }}>
                <PDFViewer width="100%" height="100%" showToolbar={true}>
                    <PosInvoicePdf
                        sale={sale}
                        items={sale.items}
                        settings={settings}
                        userName={sale.user_name || "Unknown"}
                    />
                </PDFViewer>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose} variant="outlined">
                    إغلاق
                </Button>
            </DialogActions>
        </Dialog>
    );
};
