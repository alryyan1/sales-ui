// src/components/pos/SaleBox.tsx
import React from "react";

// MUI Components
import {
  Card,
  Badge,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";

// MUI Icons
import {
  Check as CheckIcon,
} from "@mui/icons-material";

// Lucide Icons
import { RefreshCw } from "lucide-react";

// Types
import { Sale } from "./types";

interface SaleBoxProps {
  sale: Sale;
  selectedSaleId: number | null;
  loadingSaleId: number | null;
  onSaleSelect: (sale: Sale) => Promise<void>;
}

export const SaleBox: React.FC<SaleBoxProps> = ({
  sale,
  selectedSaleId,
  loadingSaleId,
  onSaleSelect,
}) => {
  return (
    <Box sx={{ position: "relative", mb: 0.2 }}>
      {/* Badge outside card - show 0 for empty sales */}
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
          ...(loadingSaleId === sale.id
            ? {
                borderColor: "warning.main",
                bgcolor: "warning.light",
                boxShadow: "0 0 0 1px",
                boxShadowColor: "warning.main",
              }
            : selectedSaleId === sale.id
            ? {
                borderColor: "primary.main",
                bgcolor: "primary.light",
                boxShadow: "0 0 0 1px",
                boxShadowColor: "primary.main",
              }
            : sale.status === "draft"
            ? {
                borderColor: "grey.300",
                borderStyle: "dashed",
                bgcolor: "grey.50",
                "&:hover": { borderColor: "grey.400" },
              }
            : {
                borderColor: "grey.200",
                bgcolor: "white",
                "&:hover": { borderColor: "grey.300", boxShadow: 1 },
              }),
          pointerEvents:
            loadingSaleId === sale.id || selectedSaleId === sale.id
              ? "none"
              : "auto",
        }}
        onClick={async () => {
          if (loadingSaleId !== sale.id && selectedSaleId !== sale.id) {
            await onSaleSelect(sale);
          }
        }}
      >
        <Box
          sx={{
            p: 0,
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {loadingSaleId === sale.id ? (
            <Box sx={{ textAlign: "center" }}>
              <CircularProgress
                size={16}
                sx={{ mb: 0.5, color: "warning.main" }}
              />
            </Box>
          ) : (
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
              <Typography
                variant="body2"
                fontWeight={700}
                color="text.primary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                {sale.sale_order_number || sale.id}
              </Typography>
            </Box>
          )}

          {/* Return icon when sale is returned */}
          {Boolean(sale.is_returned) && (
            <Box
              component="div"
              sx={{ 
                position: "absolute", 
                top: 2, 
                left: 2, 
                zIndex: 5,
                height: 14,
                width: 14,
                bgcolor: "orange.main",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: "orange.dark",
              }}
              title="تم إرجاع هذه الفاتورة"
            >
              <RefreshCw 
                size={8} 
                style={{ color: "white", display: "block" }}
              />
            </Box>
          )}

          {/* Green check mark when total amount equals total paid AND there are payments */}
          {sale.total_amount === sale.paid_amount &&
            sale.payments &&
            sale.payments.length > 0 && (
              <Box
                sx={{ position: "absolute", bottom: 0, left: 0, p: 0.5 }}
              >
                <Box
                  sx={{
                    height: 12,
                    width: 12,
                    bgcolor: "success.main",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckIcon sx={{ fontSize: 8, color: "white" }} />
                </Box>
              </Box>
            )}
        </Box>
      </Card>
    </Box>
  );
};

