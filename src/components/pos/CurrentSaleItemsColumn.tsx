// src/components/pos/CurrentSaleItemsColumn.tsx
import React, { useState } from "react";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Typography,
  CircularProgress,
  Skeleton,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Popover,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";

// MUI Icons
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteIcon from "@mui/icons-material/Delete";
import InventoryIcon from "@mui/icons-material/Inventory";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import LayersIcon from "@mui/icons-material/Layers";

// Types
import { CartItem } from "./types";
import { formatNumber } from "@/constants";
import { BatchSelectionDialog } from "./BatchSelectionDialog";
import { LiveStockDisplay } from "./LiveStockDisplay";

interface CurrentSaleItemsColumnProps {
  currentSaleItems: CartItem[];
  onUpdateQuantity: (productId: number, newQuantity: number) => Promise<void>;
  onUpdateUnitPrice?: (
    productId: number,
    newUnitPrice: number
  ) => Promise<void>;
  onRemoveItem: (productId: number) => Promise<void>;
  onUpdateBatch?: (
    productId: number,
    batchId: number | null,
    batchNumber: string | null,
    expiryDate: string | null,
    unitPrice: number
  ) => Promise<void>;
  onSwitchUnitType?: (
    productId: number,
    unitType: "stocking" | "sellable"
  ) => Promise<void>;
  isSalePaid?: boolean;
  readOnly?: boolean;
  deletingItems?: Set<number>;
  updatingItems?: Set<number>;
  isLoading?: boolean;
}

export const CurrentSaleItemsColumn: React.FC<CurrentSaleItemsColumnProps> = ({
  currentSaleItems,
  onUpdateQuantity,
  onUpdateUnitPrice,
  onRemoveItem,
  onUpdateBatch,
  onSwitchUnitType,
  isSalePaid = false,
  readOnly = false,
  deletingItems = new Set(),
  updatingItems = new Set(),
  isLoading = false,
}) => {
  const [editingQuantity, setEditingQuantity] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editingUnitPrice, setEditingUnitPrice] = useState<number | null>(null);
  const [editUnitPriceValue, setEditUnitPriceValue] = useState<string>("");
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedProductForBatch, setSelectedProductForBatch] =
    useState<CartItem | null>(null);

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (item: CartItem) => {
    const expiryDate =
      item.selectedBatchExpiryDate || item.product.earliest_expiry_date;
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);
    return expiry < today;
  };

  const getExpiryDate = (item: CartItem) => {
    return item.selectedBatchExpiryDate || item.product.earliest_expiry_date;
  };

  const isLowStock = (stockQuantity: number, alertLevel: number | null) => {
    if (!alertLevel) return false;
    return stockQuantity <= alertLevel;
  };

  const handleQuantityClick = (item: CartItem) => {
    if (isSalePaid || readOnly) return;
    setEditingQuantity(item.product.id);
    setEditValue(item.quantity.toString());
  };

  const handleQuantitySave = async (productId: number) => {
    const newQuantity = parseInt(editValue);
    if (isNaN(newQuantity) || newQuantity < 1) {
      setEditingQuantity(null);
      setEditValue("");
      return;
    }
    await onUpdateQuantity(productId, newQuantity);
    setEditingQuantity(null);
    setEditValue("");
  };

  const handleQuantityCancel = () => {
    setEditingQuantity(null);
    setEditValue("");
  };

  const handleUnitPriceClick = (item: CartItem) => {
    if (isSalePaid || readOnly || !onUpdateUnitPrice) return;
    setEditingUnitPrice(item.product.id);
    setEditUnitPriceValue(item.unitPrice.toString());
  };

  const handleUnitPriceSave = async (productId: number) => {
    if (!onUpdateUnitPrice) return;
    const newUnitPrice = parseFloat(editUnitPriceValue);
    if (isNaN(newUnitPrice) || newUnitPrice < 0) {
      setEditingUnitPrice(null);
      setEditUnitPriceValue("");
      return;
    }
    await onUpdateUnitPrice(productId, newUnitPrice);
    setEditingUnitPrice(null);
    setEditUnitPriceValue("");
  };

  const handleUnitPriceCancel = () => {
    setEditingUnitPrice(null);
    setEditUnitPriceValue("");
  };

  const handleKeyDown = (event: React.KeyboardEvent, productId: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (editingQuantity === productId) handleQuantitySave(productId);
      else if (editingUnitPrice === productId) handleUnitPriceSave(productId);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (editingQuantity === productId) handleQuantityCancel();
      else if (editingUnitPrice === productId) handleUnitPriceCancel();
    }
  };

  const handleBatchSelection = (item: CartItem) => {
    setSelectedProductForBatch(item);
    setBatchDialogOpen(true);
  };

  const handleBatchSelect = async (batch: {
    id: number;
    batch_number: string | null;
    expiry_date: string | null;
    sale_price: number;
  }) => {
    if (selectedProductForBatch && onUpdateBatch) {
      try {
        await onUpdateBatch(
          selectedProductForBatch.product.id,
          batch.id,
          batch.batch_number,
          batch.expiry_date,
          batch.sale_price
        );
      } catch (error) {
        console.error("Error updating batch:", error);
      }
    }
    setBatchDialogOpen(false);
    setSelectedProductForBatch(null);
  };

  const hasMultipleBatches = (item: CartItem) => {
    return (
      item.product.available_batches &&
      item.product.available_batches.length > 1
    );
  };

  // Stock Popover
  const [stockPopoverAnchor, setStockPopoverAnchor] =
    useState<HTMLElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentStockProduct, setCurrentStockProduct] = useState<any | null>(
    null
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleStockClick = (
    event: React.MouseEvent<HTMLElement>,
    product: any
  ) => {
    setStockPopoverAnchor(event.currentTarget);
    setCurrentStockProduct(product);
  };

  const handleStockClose = () => {
    setStockPopoverAnchor(null);
    setCurrentStockProduct(null);
  };

  const stockPopoverOpen = Boolean(stockPopoverAnchor);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Card sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <CardContent sx={{ flex: 1, p: 0 }}>
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Skeleton
                  key={i}
                  variant="rectangular"
                  height={60}
                  sx={{ mb: 1, borderRadius: 1 }}
                />
              ))}
            </Box>
          ) : currentSaleItems.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 300,
                color: "text.secondary",
              }}
            >
              <ShoppingCartIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                لا توجد عناصر في البيع
              </Typography>
              <Typography variant="body2">أضف المنتجات للبدء</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                maxHeight: "calc(100vh - 200px)",
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      #
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      المنتج
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      الكمية
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      سعر الوحدة
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      الإجمالي
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      المخزون
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: "bold" }}>
                      حذف
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentSaleItems.map((item, index) => (
                    <TableRow key={item.product.id} hover>
                      {/* Row Number */}
                      {console.log(item)}
                      <TableCell align="center">
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mx: "auto",
                            bgcolor: isExpired(item)
                              ? "error.light"
                              : "primary.light",
                            color: isExpired(item)
                              ? "error.contrastText"
                              : "primary.contrastText",
                          }}
                          title={
                            getExpiryDate(item)
                              ? `انتهاء الصلاحية: ${formatExpiryDate(
                                  getExpiryDate(item)!
                                )}`
                              : undefined
                          }
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {index + 1}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Product Name */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          <Typography variant="body1" fontWeight="medium">
                            {item.product.name}
                          </Typography>
                          {hasMultipleBatches(item) && (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleBatchSelection(item)}
                              title="اختر الدفعة"
                            >
                              <LayersIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          باركود: {item.product.sku || "غير متوفر"}
                        </Typography>
                        {item.selectedBatchNumber && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label={`الدفعة: ${item.selectedBatchNumber}`}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          </Box>
                        )}
                      </TableCell>

                      {/* Quantity */}
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={() =>
                                onUpdateQuantity(
                                  item.product.id,
                                  Math.max(1, item.quantity - 1)
                                )
                              }
                              disabled={
                                item.quantity <= 1 ||
                                isSalePaid ||
                                readOnly ||
                                updatingItems.has(item.product.id)
                              }
                            >
                              {updatingItems.has(item.product.id) ? (
                                <CircularProgress size={16} />
                              ) : (
                                <RemoveIcon fontSize="small" />
                              )}
                            </IconButton>

                            {editingQuantity === item.product.id ? (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <TextField
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) =>
                                    handleKeyDown(e, item.product.id)
                                  }
                                  onFocus={(e) => e.target.select()}
                                  size="small"
                                  sx={{ width: 60 }}
                                  inputProps={{
                                    min: 1,
                                    style: { textAlign: "center" },
                                  }}
                                  autoFocus
                                />
                                <IconButton
                                  size="small"
                                  color="success"
                                  onClick={() =>
                                    handleQuantitySave(item.product.id)
                                  }
                                >
                                  <CheckIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={handleQuantityCancel}
                                >
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            ) : (
                              <Typography
                                variant="body1"
                                fontWeight="medium"
                                sx={{
                                  cursor:
                                    isSalePaid || readOnly
                                      ? "default"
                                      : "pointer",
                                  px: 1,
                                  "&:hover": {
                                    bgcolor:
                                      isSalePaid || readOnly
                                        ? "inherit"
                                        : "action.hover",
                                  },
                                  borderRadius: 1,
                                }}
                                onClick={() => handleQuantityClick(item)}
                                title={
                                  isSalePaid
                                    ? "تم الدفع"
                                    : readOnly
                                    ? "للقراءة فقط"
                                    : "انقر لتعديل الكمية"
                                }
                              >
                                {item.quantity}
                              </Typography>
                            )}

                            <IconButton
                              size="small"
                              onClick={() =>
                                onUpdateQuantity(
                                  item.product.id,
                                  item.quantity + 1
                                )
                              }
                              disabled={
                                isSalePaid ||
                                readOnly ||
                                updatingItems.has(item.product.id)
                              }
                            >
                              {updatingItems.has(item.product.id) ? (
                                <CircularProgress size={16} />
                              ) : (
                                <AddIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Box>

                          {/* Unit Type Selector - Only show if product has both unit types */}
                          {item.product.units_per_stocking_unit &&
                            item.product.units_per_stocking_unit > 1 &&
                            onSwitchUnitType &&
                            !isSalePaid &&
                            !readOnly && (
                              <ToggleButtonGroup
                                value={item.unitType || "sellable"}
                                exclusive
                                onChange={(e, newValue) => {
                                  if (
                                    newValue !== null &&
                                    newValue !== item.unitType
                                  ) {
                                    onSwitchUnitType(item.product.id, newValue);
                                  }
                                }}
                                size="small"
                                sx={{ height: 28 }}
                              >
                                <ToggleButton value="sellable" size="small">
                                  <Tooltip
                                    title={
                                      item.product.sellable_unit_name || "قطعة"
                                    }
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{ fontSize: "0.7rem" }}
                                    >
                                      {item.product.sellable_unit_name ||
                                        "قطعة"}
                                    </Typography>
                                  </Tooltip>
                                </ToggleButton>
                                <ToggleButton value="stocking" size="small">
                                  <Tooltip
                                    title={
                                      item.product.stocking_unit_name || "صندوق"
                                    }
                                  >
                                    <Typography
                                      variant="caption"
                                      sx={{ fontSize: "0.7rem" }}
                                    >
                                      {item.product.stocking_unit_name ||
                                        "صندوق"}
                                    </Typography>
                                  </Tooltip>
                                </ToggleButton>
                              </ToggleButtonGroup>
                            )}
                          {(!item.product.units_per_stocking_unit ||
                            item.product.units_per_stocking_unit <= 1) && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: "0.7rem" }}
                            >
                              {item.product.sellable_unit_name || "قطعة"}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Unit Price */}
                      <TableCell align="center">
                        {editingUnitPrice === item.product.id ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            <TextField
                              type="number"
                              value={editUnitPriceValue}
                              onChange={(e) =>
                                setEditUnitPriceValue(e.target.value)
                              }
                              onKeyDown={(e) =>
                                handleKeyDown(e, item.product.id)
                              }
                              onFocus={(e) => e.target.select()}
                              size="small"
                              sx={{ width: 80 }}
                              inputProps={{
                                min: 0,
                                step: 0.01,
                                style: { textAlign: "center" },
                              }}
                              autoFocus
                            />
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() =>
                                handleUnitPriceSave(item.product.id)
                              }
                            >
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={handleUnitPriceCancel}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ) : (
                          <Typography
                            variant="body1"
                            fontWeight="medium"
                            sx={{
                              cursor:
                                isSalePaid || readOnly || !onUpdateUnitPrice
                                  ? "default"
                                  : "pointer",
                              "&:hover": {
                                bgcolor:
                                  isSalePaid || readOnly || !onUpdateUnitPrice
                                    ? "inherit"
                                    : "action.hover",
                              },
                              borderRadius: 1,
                              px: 1,
                            }}
                            onClick={() => handleUnitPriceClick(item)}
                            title={
                              isSalePaid
                                ? "تم الدفع"
                                : readOnly
                                ? "للقراءة فقط"
                                : "انقر لتعديل السعر"
                            }
                          >
                            {formatNumber(item.unitPrice)}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Total */}
                      <TableCell align="center">
                        <Typography
                          variant="body1"
                          fontWeight="bold"
                          color="success.main"
                        >
                          {formatNumber(item.total)}
                        </Typography>
                      </TableCell>

                      {/* Stock */}
                      <TableCell align="center">
                        <LiveStockDisplay
                          product={item.product}
                          selectedBatchId={item.selectedBatchId}
                          selectedBatchNumber={item.selectedBatchNumber}
                          isLowStock={isLowStock(
                            item.product.stock_quantity,
                            item.product.stock_alert_level
                          )}
                          onStockClick={handleStockClick}
                          currentSaleQuantity={item.quantity}
                        />
                      </TableCell>

                      {/* Delete */}
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onRemoveItem(item.product.id)}
                          disabled={
                            isSalePaid ||
                            readOnly ||
                            deletingItems.has(item.product.id)
                          }
                          title={
                            isSalePaid
                              ? "تم الدفع"
                              : readOnly
                              ? "للقراءة فقط"
                              : "حذف"
                          }
                        >
                          {deletingItems.has(item.product.id) ? (
                            <CircularProgress size={20} color="error" />
                          ) : (
                            <DeleteIcon />
                          )}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Batch Selection Dialog */}
      <BatchSelectionDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        product={selectedProductForBatch?.product || null}
        onBatchSelect={handleBatchSelect}
        selectedBatchId={selectedProductForBatch?.selectedBatchId || null}
      />

      {/* Stock Popover */}
      <Popover
        open={stockPopoverOpen}
        anchorEl={stockPopoverAnchor}
        onClose={handleStockClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="h6" gutterBottom>
            الكميات في المخازن
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {currentStockProduct?.name}
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <List dense>
            {currentStockProduct?.warehouses?.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (w: any) =>
                w.pivot?.quantity !== undefined && (
                  <ListItem key={w.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={w.name}
                      secondary={
                        <Typography
                          component="span"
                          variant="body2"
                          color={
                            Number(w.pivot.quantity) > 0
                              ? "success.main"
                              : "error.main"
                          }
                          fontWeight="bold"
                        >
                          {Number(w.pivot.quantity)}{" "}
                          {currentStockProduct?.sellable_unit_name || "قطعة"}
                        </Typography>
                      }
                    />
                  </ListItem>
                )
            )}
            {(!currentStockProduct?.warehouses ||
              currentStockProduct.warehouses.length === 0) && (
              <ListItem>
                <ListItemText primary="لا توجد معلومات مخزون إضافية" />
              </ListItem>
            )}
          </List>
        </Box>
      </Popover>
    </Box>
  );
};
