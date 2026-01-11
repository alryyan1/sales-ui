import React, { useMemo } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { OfflineSale } from "../../services/db";
import { PendingSaleBox } from "./PendingSaleBox";
import { useSettings } from "../../context/SettingsContext";
import { useAuth } from "../../context/AuthContext";

interface PendingSalesColumnProps {
  sales: OfflineSale[];
  selectedSaleId: string | null;
  onSaleSelect: (sale: OfflineSale) => void;
  onDelete?: (sale: OfflineSale) => void;
  title?: string;
  isOffline?: boolean;
  onRefresh?: () => void;
}

export const PendingSalesColumn: React.FC<PendingSalesColumnProps> = ({
  sales,
  selectedSaleId,
  onSaleSelect,
  onDelete,
  title,
  isOffline = false,
  onRefresh,
}) => {
  const { getSetting, isLoadingSettings } = useSettings();
  const { user, isLoading: isLoadingUser } = useAuth();
  
  // Wait for settings and user to load before filtering
  const isReady = !isLoadingSettings && !isLoadingUser;
  
  const filterByUser = isReady 
    ? (getSetting("pos_filter_sales_by_user", false) as boolean)
    : false;

  // Filter sales based on setting - only when ready
  const filteredSales = useMemo(() => {
    // Don't filter until settings and user are loaded
    if (!isReady) {
      return [];
    }
    
    if (!filterByUser || !user?.id) {
      return sales;
    }
    return sales.filter((sale) => sale.user_id === user.id);
  }, [sales, filterByUser, user?.id, isReady]);

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

      {!isReady && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 2,
          }}
        >
          <CircularProgress size={20} />
        </Box>
      )}

      {isReady && filteredSales.map((sale, index) => (
        <PendingSaleBox
          key={sale.tempId}
          sale={sale}
          selectedSaleId={selectedSaleId}
          onSaleSelect={onSaleSelect}
          index={filteredSales.length - index}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      ))}

      {isReady && filteredSales.length === 0 && (
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
