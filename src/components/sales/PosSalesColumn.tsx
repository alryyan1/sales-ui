import React from "react";
import { Badge, Box, Paper, Stack, CircularProgress } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import ReplayIcon from "@mui/icons-material/Replay";
import RequestQuoteIcon from "@mui/icons-material/RequestQuote";
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
        display: "flex",
        flexDirection: { xs: "row", md: "column" },
        width: { xs: "100%", md: 90 },
        flexShrink: 0,
        p: 1,
        overflowX: { xs: "auto", md: "visible" },
        overflowY: { xs: "hidden", md: "auto" },
        maxHeight: { xs: "none", md: "calc(100vh - 80px)" },
      }}
    >
      {salesLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1, width: "100%" }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <Stack
          justifyContent="center"
          alignItems="center"
          direction={{ xs: "row", md: "column" }}
          gap={1}
          sx={{ flexWrap: "nowrap" }}
        >
          {sales.map((sale) => {
            const isActive = selectedSale?.id === sale.id;
            const itemsCount = sale.items?.length ?? 0;
            const hasClient = sale.client_id != null && sale.client_id > 0;
            const hasNoPayments = (sale.payments?.length ?? 0) === 0;
            console.log(sale,'sale')
            const hasReturn = sale.is_returned === true;
            const isQuote = sale.is_quote === true;
            const badgeColor = hasNoPayments ? "error" : isActive ? "secondary" : "primary";
            return (
              <Stack direction="row" gap={1} key={sale.id} sx={{ flexShrink: 0 }}>
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
                      borderColor: isActive ? "primary.main" : isQuote ? "warning.main" : hasReturn ? "error.main" : "divider",
                      bgcolor: isActive ? "primary.main" : isQuote ? "warning.light" : "transparent",
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
                    {hasReturn && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 3,
                          right: 3,
                          color: isActive ? "primary.contrastText" : "error.main",
                          display: "flex",
                        }}
                      >
                        <ReplayIcon sx={{ fontSize: 13 }} />
                      </Box>
                    )}
                    {isQuote && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 3,
                          left: 4,
                          color: isActive ? "primary.contrastText" : "warning.dark",
                          display: "flex",
                        }}
                      >
                        <RequestQuoteIcon sx={{ fontSize: 13 }} />
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
