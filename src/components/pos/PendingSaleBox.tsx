import React from "react";
import { Card, Badge, Box, Typography } from "@mui/material";
import { CloudDone, PauseCircle } from "@mui/icons-material";
import { OfflineSale } from "../../services/db";

interface PendingSaleBoxProps {
  sale: OfflineSale;
  selectedSaleId: string | null;
  onSaleSelect: (sale: OfflineSale) => void;
  index: number;
  onDelete?: (sale: OfflineSale) => void;
}

export const PendingSaleBox: React.FC<PendingSaleBoxProps> = ({
  sale,
  selectedSaleId,
  onSaleSelect,
  index,
  onDelete,
}) => {
  const isSelected = selectedSaleId === sale.tempId;

  return (
    <Box sx={{ position: "relative", mb: 0.2 }}>
      <Badge
        badgeContent={sale.items.length}
        color={sale.items.length === 0 ? "default" : "warning"}
        sx={{
          position: "absolute",
          top: 3,
          right: 0,
          zIndex: 10,
        }}
      />

      <Card
        sx={{
          cursor: "pointer",
          transition: "all 0.2s",
          width: 50,
          height: 50,
          border: "1px solid",
          borderColor: isSelected
            ? "primary.light"
            : sale.status === "held"
            ? "warning.main"
            : "grey.200",
          bgcolor: isSelected
            ? ""
            : sale.status === "held"
            ? "warning.50"
            : "white",
          boxShadow: isSelected ? "0 0 0 1px #2563eb" : "none",
          "&:hover": { borderColor: "grey.300", boxShadow: 1 },
          position: "relative",
          overflow: "visible",
          // Show delete button on hover
          "&:hover .delete-btn": {
            opacity: 1,
            scale: "1",
          },
        }}
        onClick={() => onSaleSelect(sale)}
      >
        {/* Sync Status Icon */}
        {/* Sync Status Icon or Pending/Held Indicator */}
        <Box
          sx={{
            position: "absolute",
            top: sale.is_synced ? -5 : -3,
            left: sale.is_synced ? -5 : -3,
            width: sale.is_synced ? 16 : 8,
            height: sale.is_synced ? 16 : 8,
            bgcolor: sale.is_synced
              ? "success.main"
              : sale.status === "held"
              ? "warning.main"
              : "error.main",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            boxShadow: 1,
          }}
        >
          {sale.is_synced && (
            <CloudDone sx={{ fontSize: 10, color: "white" }} />
          )}
          {!sale.is_synced && sale.status === "held" && (
            <PauseCircle sx={{ fontSize: 10, color: "white" }} />
          )}
        </Box>

        {/* Delete Button (Top Right) */}
        {!sale.is_synced && onDelete && (
          <Box
            className="delete-btn"
            sx={{
              position: "absolute",
              top: -8,
              right: -8,
              bgcolor: "error.main",
              borderRadius: "50%",
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 30, // Higher than badge
              opacity: 0,
              scale: "0.8",
              transition: "all 0.2s",
              boxShadow: 2,
              "&:hover": { bgcolor: "error.dark" },
            }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(sale);
            }}
          >
            <Typography
              sx={{
                color: "white",
                fontSize: "12px",
                fontWeight: "bold",
                lineHeight: 1,
              }}
            >
              ×
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            height: "100%",
            width: "100%",
          }}
        >
          {/* Display sequential number or order number */}
          <Typography
            variant="caption"
            fontWeight={700}
            color={
              sale.is_synced && sale.sale_order_number
                ? "primary.main"
                : "text.secondary"
            }
            sx={{ fontSize: "0.85rem" }}
          >
            {sale.is_synced && sale.sale_order_number
              ? `#${sale.sale_order_number}`
              : `#${index}`}
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontSize: "0.6rem", color: "text.disabled" }}
          >
            {new Date(sale.offline_created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};
