interface ProductRowProps {
  product: ProductWithOptionalBatches;
  onEdit: (product: ProductWithOptionalBatches) => void;
  onOpenStockDialog: (product: ProductWithOptionalBatches) => void;
  onOpenHistoryDialog: (product: ProductWithOptionalBatches) => void;
  copyToClipboard: (sku: string) => void;
  copiedSku: string | null;
  isLoading: boolean;
}

const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onEdit,
  onOpenStockDialog,
  onOpenHistoryDialog,
  copyToClipboard,
  copiedSku,
  isLoading,
}) => {
  const stockQty = Number(
    product.current_stock_quantity ?? product.stock_quantity ?? 0,
  );
  const isLow =
    product.stock_alert_level !== null &&
    stockQty <= (product.stock_alert_level as number);
  const isOutOfStock = stockQty <= 0;

  const prevStockRef = React.useRef<number>(stockQty);
  const [animationClass, setAnimationClass] = React.useState("");

  React.useEffect(() => {
    if (stockQty > prevStockRef.current) {
      setAnimationClass("animate-flash-green");
    } else if (stockQty < prevStockRef.current) {
      setAnimationClass("animate-flash-red");
    }

    if (stockQty !== prevStockRef.current) {
      const timer = setTimeout(() => {
        setAnimationClass("");
      }, 2000);
      prevStockRef.current = stockQty;
      return () => clearTimeout(timer);
    }
  }, [stockQty]);

  return (
    <TableRow
      hover
      sx={{ cursor: "pointer" }}
      className={animationClass}
      onClick={() => onEdit(product)}
    >
      <TableCell align="center">{product.id}</TableCell>
      <TableCell align="center">
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="body2" component="span">
            {product.sku || "---"}
          </Typography>
          {product.sku && (
            <Tooltip title={copiedSku === product.sku ? "تم النسخ" : "نسخ SKU"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(product.sku!);
                }}
                disabled={isLoading}
                sx={{ width: 24, height: 24, p: 0 }}
              >
                {copiedSku === product.sku ? (
                  <Check
                    style={{
                      width: 14,
                      height: 14,
                      color: "var(--mui-palette-success-main)",
                    }}
                  />
                ) : (
                  <Copy style={{ width: 14, height: 14 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell align="left">
        <Typography variant="body2" fontWeight={600}>
          {product.name}
        </Typography>
      </TableCell>
      <TableCell align="center">
        {product.category_name ? (
          <Chip
            label={product.category_name}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.75rem", height: 24 }}
          />
        ) : (
          "---"
        )}
      </TableCell>
      <TableCell align="center">
        {product.sellable_unit_name || "---"}
      </TableCell>
      <TableCell align="center">
        {product.stocking_unit_name || "---"}
      </TableCell>
      <TableCell align="center">
        {product.units_per_stocking_unit || "---"}
      </TableCell>
      <TableCell align="center">
        {product.created_at
          ? new Date(product.created_at).toLocaleDateString("en-GB")
          : "---"}
      </TableCell>
      <TableCell align="center">
        {product.stock_alert_level !== null
          ? formatNumber(product.stock_alert_level)
          : "---"}
      </TableCell>
      <TableCell align="center">
        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          justifyContent="center"
        >
          <Typography variant="body1" fontWeight={600}>
            {formatNumber(stockQty)}
          </Typography>
          {(isLow || isOutOfStock) && (
            <Tooltip
              title={isOutOfStock ? "نفاد المخزون" : "تنبيه: المخزون منخفض"}
            >
              <AlertTriangle
                style={{
                  width: 16,
                  height: 16,
                  color: isOutOfStock
                    ? "var(--mui-palette-error-main)"
                    : "var(--mui-palette-warning-main)",
                }}
              />
            </Tooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell align="center">
        {product.warehouses?.length ? (
          <Tooltip title="تفاصيل المخزون">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onOpenStockDialog(product);
              }}
              sx={{ p: 0.5 }}
            >
              <Info
                style={{
                  width: 18,
                  height: 18,
                  color: "var(--mui-palette-info-main)",
                }}
              />
            </IconButton>
          </Tooltip>
        ) : null}
      </TableCell>
      <TableCell align="center">
        {product.latest_cost_per_sellable_unit
          ? formatCurrency(Number(product.latest_cost_per_sellable_unit))
          : "---"}
      </TableCell>
      <TableCell align="center">
        {product.last_sale_price_per_sellable_unit
          ? formatCurrency(Number(product.last_sale_price_per_sellable_unit))
          : "---"}
      </TableCell>

      <TableCell align="center">
        <Stack direction="row" spacing={1} justifyContent="center">
          <Tooltip title="السجل">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onOpenHistoryDialog(product);
              }}
              disabled={isLoading}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  bgcolor: "action.hover",
                  color: "text.primary",
                },
              }}
            >
              <History style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="تعديل">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(product);
              }}
              disabled={isLoading}
              sx={{
                color: "primary.main",
                "&:hover": {
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                },
              }}
            >
              <Edit style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </TableCell>
    </TableRow>
  );
};
