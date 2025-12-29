import React from "react";
import { Box, Typography } from "@mui/material";
import { OfflineSale } from "../../services/db";
import { PendingSaleBox } from "./PendingSaleBox";

interface PendingSalesColumnProps {
  sales: OfflineSale[];
  selectedSaleId: string | null;
  onSaleSelect: (sale: OfflineSale) => void;
  onDelete?: (sale: OfflineSale) => void;
  title?: string;
  isOffline?: boolean;
}

export const PendingSalesColumn: React.FC<PendingSalesColumnProps> = ({
  sales,
  selectedSaleId,
  onSaleSelect,
  onDelete,
  title,
  isOffline = false,
}) => {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        // borderRight removed from here, container handles border
        alignItems: "center",
        overflowY: "auto",
        gap: 1,
        px: 1,
        pt: 2,
        pb: 2,
        bgcolor: "white",
        minWidth: 80,
      }}
    >
      <Typography
        variant="caption"
        fontWeight="bold"
        color="text.secondary"
        sx={{ mb: 1, textAlign: "center" }}
      >
        {title || "SALES"}
      </Typography>

      {sales.map((sale, index) => (
        <PendingSaleBox
          key={sale.tempId}
          sale={sale}
          selectedSaleId={selectedSaleId}
          onSaleSelect={onSaleSelect}
          index={sales.length - index}
          onDelete={onDelete}
        />
      ))}

      {sales.length === 0 && (
        <Typography
          variant="caption"
          color="text.disabled"
          align="center"
          sx={{ px: 1 }}
        >
          {isOffline
            ? "يتطلب اتصال بالإنترنت"
            : title === "SYNCED"
            ? "لا توجد مبيعات متزامنة"
            : "لا توجد مبيعات معلقة"}
        </Typography>
      )}
    </Box>
  );
};
