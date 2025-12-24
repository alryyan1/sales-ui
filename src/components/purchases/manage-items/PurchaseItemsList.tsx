// src/components/purchases/manage-items/PurchaseItemsList.tsx
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
  Box,
} from "@mui/material";

import PurchaseItemCard from "./PurchaseItemCard";
import { PurchaseItem } from "@/services/purchaseService";
import { ProductUnitsMap } from "./types";

interface PurchaseItemsListProps {
  items: PurchaseItem[];
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
  // Pagination props
  page: number;
  perPage: number;
  total: number;
  searchQuery: string;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
  onSearchChange: (query: string) => void;
}

import { TextField, TablePagination, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
  items,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
  page,
  perPage,
  total,
  searchQuery,
  onPageChange,
  onPerPageChange,
  onSearchChange,
}) => {
  // We do NOT sort here anymore, sorting should be server-side or assumed by ID desc from server
  // const sortedItems = [...items].sort((a, b) => b.id - a.id);
  // API returns sorted by ID desc

  return (
    <Card>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">أصناف المشتريات ({total})</Typography>
          <TextField
            size="small"
            placeholder="بحث باسم المنتج، الرمز، أو رقم الباتش..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Stack>
        <Divider sx={{ mb: 2 }} />

        {items.length > 0 ? (
          <Stack spacing={2}>
            {items.map((item, index) => (
              <PurchaseItemCard
                key={item.id}
                item={item}
                index={index} // Display index might be confusing with pagination... maybe show actual ID? or just remove index prop used for numbering
                totalItems={total} // Pass total for numbering logic if needed, or just items.length
                productUnits={productUnits}
                isReadOnly={isReadOnly}
                isDeleting={isDeleting}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              {searchQuery
                ? "لا توجد نتائج للبحث"
                : "لا توجد أصناف في هذه المشتريات"}
            </Typography>
          </Box>
        )}

        <TablePagination
          component="div"
          count={total}
          page={page - 1} // MUI is 0-indexed, API is 1-indexed
          onPageChange={(e, p) => onPageChange(p + 1)}
          rowsPerPage={perPage}
          onRowsPerPageChange={(e) =>
            onPerPageChange(parseInt(e.target.value, 10))
          }
          rowsPerPageOptions={[20, 50, 100, 200]}
          labelRowsPerPage="صفوف لكل صفحة:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} من ${count !== -1 ? count : `أكثر من ${to}`}`
          }
        />
      </CardContent>
    </Card>
  );
};

export default PurchaseItemsList;
