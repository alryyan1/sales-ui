// src/components/pos/TodaySalesColumn.tsx
import React from "react";

// MUI Components
import {
  Button,
  Box,
} from "@mui/material";

// MUI Icons
import {
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";

// Components
import { SaleBox } from "./SaleBox";

// Types
import { Sale } from "./types";

interface TodaySalesColumnProps {
  sales: Sale[];
  selectedSaleId: number | null;
  onSaleSelect: (sale: Sale) => Promise<void>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  filterByCurrentUser?: boolean;
  selectedDate?: string;
  loadingSaleId?: number | null;
  isLoading?: boolean; // Add loading state
}

export const TodaySalesColumn: React.FC<TodaySalesColumnProps> = ({
  sales,
  selectedSaleId,
  onSaleSelect,
  onToggleCollapse,
  loadingSaleId = null,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <Box
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 1,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "primary.light",
            width: "100%",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  height: 16,
                  width: 48,
                  bgcolor: "grey.300",
                  borderRadius: 1,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <Button
                variant="text"
                size="small"
                onClick={onToggleCollapse}
                sx={{ minWidth: 16, p: 0 }}
              >
                <ChevronLeftIcon sx={{ fontSize: 10, color: "primary.main" }} />
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Skeleton Sales List */}
        <Box
          sx={{
            flex: 1,
            p: 0.5,
            overflowY: "auto",
            height: "100%",
            width: "100%",
          }}
        >
          <Box
            sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 1, p: 1 }}
          >
            {[...Array(8)].map((_, index) => (
              <Box key={index} sx={{ position: "relative" }}>
                <Box
                  sx={{
                    width: 50,
                    height: 50,
                    bgcolor: "grey.300",
                    borderRadius: 1,
                    mx: "auto",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: window.innerHeight - 100,
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid",
        borderColor: "divider",
        alignItems: "center",
        overflowY: "auto",
        gap: 1,
        px: 1,
        pt: 2,
        pb: 2,
      }}
    >
      {sales.map((sale) => (
        <SaleBox
          key={sale.id}
          sale={sale}
          selectedSaleId={selectedSaleId}
          loadingSaleId={loadingSaleId}
          onSaleSelect={onSaleSelect}
        />
      ))}
    </Box>
  );
};

export default TodaySalesColumn;
