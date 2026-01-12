// src/components/products/ProductImage.tsx
import React, { useState } from "react";
import { Box, Avatar, useTheme } from "@mui/material";
import { Package } from "lucide-react";

interface ProductImageProps {
  imageUrl?: string | null;
  productName?: string;
  size?: number;
  variant?: "rounded" | "circular" | "square";
  sx?: any;
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

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageUrl && !imageError) {
    return (
      <Box
        component="img"
        src={imageUrl}
        alt={productName}
        onError={handleImageError}
        sx={{
          width: size,
          height: size,
          objectFit: "cover",
          borderRadius:
            variant === "circular"
              ? "50%"
              : variant === "rounded"
              ? 1
              : 0,
          ...sx,
        }}
      />
    );
  }

  // Fallback: Show avatar with first letter or package icon
  const firstLetter = productName?.charAt(0).toUpperCase() || "P";
  
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        bgcolor: theme.palette.primary.main,
        ...sx,
      }}
      variant={variant === "circular" ? "circular" : "rounded"}
    >
      {firstLetter}
    </Avatar>
  );
};

