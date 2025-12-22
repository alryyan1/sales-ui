// src/components/products/ProductsTable.tsx
import React, { useState } from "react";
import {
  Paper,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Chip,
  Stack,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridToolbar,
} from "@mui/x-data-grid";
import { Edit, AlertTriangle, Copy, Check } from "lucide-react";

// Types
import { Product as ProductType } from "@/services/productService";
import { formatNumber, formatCurrency } from "@/constants";

// Interface for Product with potentially loaded batches
interface ProductWithOptionalBatches
  extends Omit<
    ProductType,
    | "latest_cost_per_sellable_unit"
    | "suggested_sale_price_per_sellable_unit"
    | "scientific_name"
  > {
  available_batches?: {
    batch_id: number;
    quantity: number;
    expiry_date?: string;
  }[];
  category_name?: string | null;
  latest_cost_per_sellable_unit?: string | number | null;
  suggested_sale_price_per_sellable_unit?: string | number | null;
  sellable_unit_name?: string | null;
  stocking_unit_name?: string | null;
  units_per_stocking_unit?: number | null;
  scientific_name?: string | null;
}

interface ProductsTableProps {
  products: ProductWithOptionalBatches[];
  isLoading?: boolean;
  onEdit: (product: ProductWithOptionalBatches) => void;
  // Server-side pagination props
  rowCount: number;
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading = false,
  onEdit,
  rowCount,
  paginationModel,
  onPaginationModelChange,
}) => {
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const copyToClipboard = async (sku: string) => {
    try {
      await navigator.clipboard.writeText(sku);
      setCopiedSku(sku);
      setTimeout(() => setCopiedSku(null), 2000);
    } catch (err) {
      console.error("Failed to copy SKU:", err);
    }
  };

  const columns: GridColDef[] = [
    {
      field: "id",
      headerName: "#",
      width: 70,
      align: "center",
      headerAlign: "center",
    },
    {
      field: "sku",
      headerName: "الرمز (SKU)",
      width: 150,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => {
        const sku = params.value as string;
        if (!sku)
          return (
            <Typography variant="body2" color="text.disabled">
              ---
            </Typography>
          );
        return (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="center"
          >
            <Typography variant="body2" component="span">
              {sku}
            </Typography>
            <Tooltip title={copiedSku === sku ? "تم النسخ" : "نسخ SKU"}>
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  copyToClipboard(sku);
                }}
                disabled={isLoading}
                sx={{ width: 24, height: 24, p: 0 }}
              >
                {copiedSku === sku ? (
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
          </Stack>
        );
      },
    },
    {
      field: "name",
      headerName: "اسم المنتج",
      minWidth: 200,
      flex: 1,
      align: "right", // Arabic names align right traditionally
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" fontWeight={600}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: "scientific_name",
      headerName: "الاسم العلمي",
      width: 150,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => value || "---",
    },
    {
      field: "category_name",
      headerName: "الفئة",
      width: 130,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) =>
        params.value ? (
          <Chip
            label={params.value}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.75rem", height: 24 }}
          />
        ) : (
          <Typography variant="body2" color="text.disabled">
            ---
          </Typography>
        ),
    },
    {
      field: "sellable_unit_name",
      headerName: "وحدة البيع",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => value || "---",
    },
    {
      field: "stocking_unit_name",
      headerName: "وحدة التخزين",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => value || "---",
    },
    {
      field: "units_per_stocking_unit",
      headerName: "نسبة التحويل",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => value || "---",
    },
    {
      field: "created_at",
      headerName: "تم إنشاؤه في",
      width: 120,
      align: "center",
      headerAlign: "center",
      valueGetter: (value) =>
        value ? new Date(value).toLocaleDateString("en-GB") : "---",
    },
    {
      field: "stock_alert_level",
      headerName: "تنبيه المخزون",
      width: 110,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => (value !== null ? formatNumber(value) : "---"),
    },
    {
      field: "current_stock_quantity", // Accessor might not be in row directly if type mismatch
      headerName: "إجمالي المخزون",
      width: 130,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams) => {
        const stockQty = Number(
          params.row.current_stock_quantity ?? params.row.stock_quantity ?? 0
        );
        const isLow =
          params.row.stock_alert_level !== null &&
          stockQty <= (params.row.stock_alert_level as number);
        const isOutOfStock = stockQty <= 0;

        return (
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
        );
      },
    },
    {
      field: "latest_cost_per_sellable_unit",
      headerName: "أحدث تكلفة",
      width: 120,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) =>
        value ? formatCurrency(Number(value)) : "---",
    },
    {
      field: "last_sale_price_per_sellable_unit",
      headerName: "آخر سعر بيع",
      width: 120,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) =>
        value ? formatCurrency(Number(value)) : "---",
    },
    {
      field: "suggested_sale_price_per_sellable_unit",
      headerName: "السعر المقترح",
      width: 120,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) =>
        value ? formatCurrency(Number(value)) : "---",
    },
    {
      field: "total_items_purchased",
      headerName: "تم شراؤه",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => (value ? formatNumber(Number(value)) : "0"),
    },
    {
      field: "total_items_sold",
      headerName: "تم بيعه",
      width: 100,
      align: "center",
      headerAlign: "center",
      valueFormatter: (value) => (value ? formatNumber(Number(value)) : "0"),
    },
    {
      field: "actions",
      headerName: "إجراءات",
      width: 80,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Tooltip title="تعديل">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(params.row as ProductWithOptionalBatches);
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
      ),
    },
  ];

  if (products.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 300,
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          لا توجد منتجات لعرضها
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{ height: 650, width: "100%", borderRadius: 2, overflow: "hidden" }}
      elevation={0}
    >
      <DataGrid
        rows={products}
        columns={columns}
        loading={isLoading}
        disableRowSelectionOnClick
        onRowClick={(params) =>
          onEdit(params.row as ProductWithOptionalBatches)
        }
        // Server-side pagination
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={onPaginationModelChange}
        paginationMode="server"
        slots={{ toolbar: GridToolbar }}
        slotProps={{
          toolbar: {
            showQuickFilter: true,
            quickFilterProps: { debounceMs: 500 },
          },
        }}
        sx={{
          border: 0,
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid #f0f0f0",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "action.hover", // Match previous style
            borderBottom: "1px solid #e0e0e0",
            fontSize: "0.875rem",
            fontWeight: 600,
          },
          "& .MuiDataGrid-row": {
            cursor: "pointer",
          },
        }}
        pageSizeOptions={[10, 25, 50, 100, 200, 500, 1000]}
      />
    </Paper>
  );
};
