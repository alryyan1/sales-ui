import React from "react";
import { Badge, Box, Paper, Stack, CircularProgress } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import type { Sale } from "@/services/saleService";

export interface PosSalesColumnProps {
  sales: Sale[];
  salesLoading: boolean;
  selectedSale: Sale | null;
  onSelectSale: (sale: Sale) => void;
}

export const PosSalesColumn: React.FC<PosSalesColumnProps> = ({
  sales,
  salesLoading,
  selectedSale,
  onSelectSale,
}) => {
  return (
    <Box
      sx={{
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        width: 90,
        p:1,
        flexShrink: 0,
        overflowY: "auto",
        maxHeight: "calc(100vh - 80px)",
      }}
    >
      {salesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack justifyContent="center" alignItems="center" direction="column" gap={1}>
          {sales.map((sale) => {
            const isActive = selectedSale?.id === sale.id;
            const itemsCount = sale.items?.length ?? 0;
            const hasClient = sale.client_id != null && sale.client_id > 0;
            const hasNoPayments = (sale.payments?.length ?? 0) === 0;
            const badgeColor = hasNoPayments ? "error" : isActive ? "secondary" : "primary";
            return (
              <Stack direction="row" gap={1} key={sale.id}>
                <Badge
                  badgeContent={itemsCount}
                  color={badgeColor}
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: 10,
                      fontWeight: 700,
                      minWidth: 18,
                      height: 18,
                    },
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      width: 60,
                      height: 60,
                      borderRadius: 1.5,
                      border: "2px solid",
                      borderColor: isActive ? "primary.main" : "divider",
                      bgcolor: isActive ? "primary.main" : "transparent",
                      color: isActive ? "primary.contrastText" : "text.primary",
                      p: 1,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      position: "relative",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                    onClick={() => onSelectSale(sale)}
                  >
                    {hasClient && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          color: isActive ? "primary.contrastText" : "text.secondary",
                        }}
                      >
                        <PersonIcon sx={{ fontSize: 14 }} />
                      </Box>
                    )}
                    <Box component="span" sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {sale.number}
                    </Box>
                  </Paper>
                </Badge>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
