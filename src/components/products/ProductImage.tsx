// src/components/products/ProductImage.tsx
import React, { useState } from "react";
import {
  Box,
  useTheme,
  SxProps,
  Theme,
  Popover,
  Typography,
  Grow,
} from "@mui/material";

interface ProductImageProps {
  imageUrl?: string | null;
  productName?: string;
  size?: number;
  variant?: "rounded" | "circular" | "square";
  sx?: SxProps<Theme>;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  imageUrl,
  productName = "Product",
  size = 40,
  variant = "rounded",
  sx,
}) => {
  const theme = useTheme();
  const [imageError, setImageError] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleMouseEnter = (event: React.MouseEvent<HTMLElement>) => {
    if (imageUrl && !imageError) {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleMouseLeave = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const handleImageError = () => {
    setImageError(true);
    setAnchorEl(null);
  };

  // Modern, premium fallback gradients based on theme
  const fallbackGradient =
    theme.palette.mode === "dark"
      ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`
      : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`;

  const borderRadius =
    variant === "circular" ? "50%" : variant === "rounded" ? "12px" : "0px";

  if (imageUrl && !imageError) {
    return (
      <Box
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        sx={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: borderRadius,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          border: `1px solid ${theme.palette.divider}`,
          cursor: "pointer",
          transition:
            "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease",
          "&:hover": {
            transform: "translateY(-2px) scale(1.05)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 10,
          },
          ...sx,
        }}
      >
        <Box
          component="img"
          src={imageUrl}
          alt={productName}
          onError={handleImageError}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "opacity 0.3s ease",
          }}
        />

        <Popover
          id="mouse-over-popover"
          sx={{
            pointerEvents: "none",
          }}
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "center",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "center",
            horizontal: "left",
          }}
          onClose={handleMouseLeave}
          disableRestoreFocus
          TransitionComponent={Grow}
          TransitionProps={{ timeout: 400 }}
          PaperProps={{
            sx: {
              p: 1.5,
              borderRadius: "16px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: `1px solid ${theme.palette.divider}`,
              background:
                theme.palette.mode === "dark"
                  ? "rgba(30, 30, 30, 0.95)"
                  : "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(12px)",
              maxWidth: 320,
              overflow: "hidden",
              margin: "0 10px",
            },
          }}
        >
          <Box sx={{ position: "relative" }}>
            <Box
              component="img"
              src={imageUrl}
              alt={productName}
              sx={{
                width: "100%",
                maxHeight: 280,
                borderRadius: "8px",
                objectFit: "contain",
                display: "block",
                mb: 1,
              }}
            />
            <Typography
              variant="subtitle2"
              align="center"
              sx={{
                fontWeight: 600,
                color: theme.palette.text.primary,
              }}
            >
              {productName}
            </Typography>
          </Box>
        </Popover>
      </Box>
    );
  }

  // Fallback: Show avatar with a modern gradient and glassmorphism-like feel
  const firstLetter = productName?.trim().charAt(0).toUpperCase() || "P";

  return (
    <Box
      sx={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: borderRadius,
        background: fallbackGradient,
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.4,
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
        transition: "all 0.3s ease",
        position: "relative",
        overflow: "hidden",
        "&::after": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)",
        },
        ...sx,
      }}
    >
      {firstLetter}
    </Box>
  );
};

export default ProductImage;
