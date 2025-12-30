// src/components/common/PdfViewerDialog.tsx
import React, { useState, useEffect } from "react";

// MUI Components
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Stack,
  Alert,
} from "@mui/material";

// Lucide Icons
import { Download, X } from "lucide-react";

interface PdfViewerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title?: string;
}

export const PdfViewerDialog: React.FC<PdfViewerDialogProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  title,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pdfUrl) {
      setIsLoading(true);
      setError(null);
    }
  }, [isOpen, pdfUrl]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `inventory_report_${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError("خطأ في تحميل ملف PDF");
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          width: "95vw",
          maxWidth: "1200px",
          height: "90vh",
          maxHeight: "90vh",
          borderRadius: 3,
        },
      }}
    >
      <DialogContent sx={{ p: 0, height: "100%", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            p: 3,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <DialogTitle
            sx={{
              p: 0,
              m: 0,
              fontWeight: 600,
              fontSize: "1.125rem",
            }}
          >
            {title || "تقرير المخزون"}
          </DialogTitle>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              onClick={handleDownload}
              startIcon={<Download size={18} />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 500,
              }}
            >
              تحميل
            </Button>
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                border: 1,
                borderColor: "divider",
                "&:hover": {
                  borderColor: "primary.main",
                  bgcolor: "action.hover",
                },
              }}
            >
              <X size={18} />
            </IconButton>
          </Stack>
        </Box>

        {/* Content Area */}
        <Box
          sx={{
            flex: 1,
            position: "relative",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Loading State */}
          {isLoading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.paper",
                zIndex: 10,
              }}
            >
              <Stack spacing={2} alignItems="center">
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary">
                  جاري تحميل ملف PDF...
                </Typography>
              </Stack>
            </Box>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "background.paper",
                zIndex: 10,
                p: 3,
              }}
            >
              <Stack spacing={2} alignItems="center" sx={{ textAlign: "center" }}>
                <Alert severity="error" sx={{ width: "100%", maxWidth: 400 }}>
                  {error}
                </Alert>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onClose}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                  }}
                >
                  إغلاق
                </Button>
              </Stack>
            </Box>
          )}

          {/* PDF Iframe */}
          <Box
            component="iframe"
            src={pdfUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={title || "تقرير المخزون"}
            sx={{
              width: "100%",
              height: "100%",
              border: 0,
              flex: 1,
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}; 