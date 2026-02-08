// src/pages/PosBlankPage.tsx
// Blank POS page: header + three-column layout

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  AppBar,
  Toolbar,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import apiClient from "@/lib/axios";
import { toast } from "sonner";
import saleService from "@/services/saleService";

interface Shift {
  id: number;
  opened_at: string | null;
  closed_at: string | null;
  is_open: boolean;
}

const PosBlankPage: React.FC = () => {
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const [createSaleLoading, setCreateSaleLoading] = useState(false);

  const fetchCurrentShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      const res = await apiClient.get("/shifts/current");
      if (res.status === 200) {
        const d = res.data.data ?? res.data;
        setShift({
          ...d,
          is_open: d.is_open === true || d.is_open === "true" || d.is_open === 1,
        });
      } else {
        setShift(null);
      }
    } catch (e: unknown) {
      if (e && typeof e === "object" && "response" in e) {
        const err = e as { response?: { status?: number } };
        if (err.response?.status === 204) setShift(null);
      } else {
        console.error("Failed to load current shift:", e);
      }
    } finally {
      setShiftLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentShift();
  }, [fetchCurrentShift]);

  const handleOpenShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      const res = await apiClient.post("/shifts/open");
      const d = res.data.data ?? res.data;
      setShift({ ...d, is_open: true });
      toast.success("تم فتح الوردية");
    } catch (err) {
      console.error("Failed to open shift:", err);
      toast.error("فشل فتح الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const handleCloseShift = useCallback(async () => {
    try {
      setShiftLoading(true);
      await apiClient.post("/shifts/close");
      setShift(null);
      toast.success("تم إغلاق الوردية");
    } catch (err) {
      console.error("Failed to close shift:", err);
      toast.error("فشل إغلاق الوردية");
    } finally {
      setShiftLoading(false);
    }
  }, []);

  const isShiftOpen = shift?.is_open === true;

  const handleCreateNewSale = useCallback(async () => {
    try {
      setCreateSaleLoading(true);
      await saleService.createEmptySale({
        client_id: null,
        notes: null,
      });
      toast.success("تم إنشاء عملية بيع جديدة");
    } catch (err) {
      toast.error(saleService.getErrorMessage(err));
    } finally {
      setCreateSaleLoading(false);
    }
  }, []);

  return (
    <Box
      sx={{
        height: "calc(100vh - 10px)",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.100",
      }}
    >
      {/* Header */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "white",
          color: "text.primary",
          borderBottom: "1px solid",
          borderColor: "divider",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        <Toolbar sx={{ height: 64, px: { xs: 2, sm: 3 }, gap: 2 }}>
          <Typography
            variant="h6"
            fontWeight="700"
            sx={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            POS
          </Typography>

          {/* Shift ID */}
          {shift?.id != null && (
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              وردية #{shift.id}
            </Typography>
          )}

          {/* Create new sale */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateNewSale}
            disabled={createSaleLoading || !isShiftOpen}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {createSaleLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              "بيع جديد"
            )}
          </Button>

          {/* Open / Close shift button */}
          <Button
            variant={isShiftOpen ? "outlined" : "contained"}
            color={isShiftOpen ? "error" : "primary"}
            onClick={isShiftOpen ? handleCloseShift : handleOpenShift}
            disabled={shiftLoading}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {shiftLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : isShiftOpen ? (
              "إغلاق وردية"
            ) : (
              "فتح وردية"
            )}
          </Button>
        </Toolbar>
      </AppBar>

      {/* Three-column layout */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          px: { xs: 1, sm: 2, lg: 3 },
          py: 1.5,
        }}
      >
        <Box
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 1.5,
          }}
        >
          {/* Left column */}
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              width: 280,
              flexShrink: 0,
            }}
          >
            <Paper
              sx={{
                height: "100%",
                overflow: "auto",
                p: 2,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Column 1
              </Typography>
            </Paper>
          </Box>

          {/* Center column */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Paper
              sx={{
                height: "100%",
                overflow: "auto",
                p: 2,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Column 2
              </Typography>
            </Paper>
          </Box>

          {/* Right column */}
          <Box
            sx={{
              width: { xs: "100%", md: 320 },
              flexShrink: 0,
            }}
          >
            <Paper
              sx={{
                height: "100%",
                overflow: "auto",
                p: 2,
                borderRadius: 2,
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                Column 3
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default PosBlankPage;
