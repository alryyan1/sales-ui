// src/components/purchases/manage-items/PurchaseItemsList.tsx
import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Stack,
  Box,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  CircularProgress,
  Backdrop,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  ChevronLeft,
  ChevronRight,
  FirstPage,
  LastPage,
} from "@mui/icons-material";

import PurchaseItemCard from "./PurchaseItemCard";
import { PurchaseItem } from "@/services/purchaseService";
import { ProductUnitsMap } from "./types";
import { PaginatedResponse } from "@/services/clientService";

interface PurchaseItemsListProps {
  items: PurchaseItem[];
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
  // Pagination props - using Laravel pagination structure
  pagination: PaginatedResponse<PurchaseItem> | null;
  searchQuery: string;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
  onSearchChange: (query: string) => void;
}

const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
  items,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
  pagination,
  searchQuery,
  isLoading = false,
  onPageChange,
  onPerPageChange,
  onSearchChange,
}) => {
  // Handle Laravel pagination structure: data, links (object), meta (object with pagination info)
  const meta = (pagination as any)?.meta || pagination;
  const linksObject = (pagination as any)?.links || {};
  
  const total = meta?.total || items.length;
  const currentPage = meta?.current_page || 1;
  const perPage = meta?.per_page || 20;
  const from = meta?.from || 0;
  const to = meta?.to || items.length;
  const lastPage = meta?.last_page || 1;
  const links = Array.isArray(meta?.links) ? meta.links : [];
  
  // Extract first/last/prev/next from links object (not the array)
  const firstPageUrl = linksObject?.first || null;
  const lastPageUrl = linksObject?.last || null;
  const prevPageUrl = linksObject?.prev || null;
  const nextPageUrl = linksObject?.next || null;

  // Extract page number from Laravel pagination URL
  const getPageFromUrl = (url: string | null): number | null => {
    if (!url) return null;
    const match = url.match(/[?&]page=(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const handlePageClick = (url: string | null) => {
    if (!url) return;
    const pageNum = getPageFromUrl(url);
    if (pageNum) {
      onPageChange(pageNum);
    }
  };

  return (
    <Card sx={{ position: "relative" }}>
      <Backdrop
        open={isLoading}
        sx={{
          position: "absolute",
          zIndex: (theme) => theme.zIndex.modal - 1,
          backgroundColor: "rgba(255, 255, 255, 0.7)",
          borderRadius: 1,
        }}
      >
        <CircularProgress />
      </Backdrop>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
        >
          <Typography variant="h6">
            أصناف المشتريات ({total})
          </Typography>
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

        {/* Laravel Pagination Controls at Top */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2}
          flexWrap="wrap"
          gap={2}
        >
          {/* Rows Per Page Selector */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>صفوف لكل صفحة</InputLabel>
            <Select
              value={perPage}
              label="صفوف لكل صفحة"
              disabled={isLoading}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
            >
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
              <MenuItem value={200}>200</MenuItem>
            </Select>
          </FormControl>

          {/* Pagination Info */}
          <Typography variant="body2" color="text.secondary">
            عرض {from} إلى {to} من {total} نتائج
          </Typography>

          {/* Laravel Pagination Links */}
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
            {/* First Page */}
            {firstPageUrl && (
              <IconButton
                size="small"
                disabled={currentPage === 1 || isLoading}
                onClick={() => handlePageClick(firstPageUrl)}
                aria-label="الصفحة الأولى"
              >
                <FirstPage />
              </IconButton>
            )}

            {/* Previous Page */}
            {prevPageUrl && (
              <IconButton
                size="small"
                disabled={!prevPageUrl || isLoading}
                onClick={() => handlePageClick(prevPageUrl)}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight />
              </IconButton>
            )}

            {/* Page Numbers from Laravel links */}
            {Array.isArray(links) && links.length > 0
              ? links
                  .filter((link) => {
                    if (!link || typeof link !== "object") return false;
                    // Filter out Previous/Next links (we handle them separately)
                    const label = String(link.label || "").trim();
                    return (
                      label !== "Previous" &&
                      label !== "Next" &&
                      label !== "&laquo; Previous" &&
                      label !== "Next &raquo;" &&
                      label !== "..."
                    );
                  })
                  .map((link, index) => {
                    if (!link || typeof link !== "object") return null;
                    const label = String(link.label || "").trim();
                    
                    // Handle ellipsis
                    if (label === "..." || label === "&hellip;") {
                      return (
                        <Typography
                          key={`ellipsis-${index}`}
                          variant="body2"
                          sx={{ px: 1, color: "text.secondary" }}
                        >
                          ...
                        </Typography>
                      );
                    }

                    const pageNum = parseInt(label, 10);
                    if (isNaN(pageNum)) {
                      return null;
                    }

                    return (
                      <IconButton
                        key={`page-${pageNum}`}
                        size="small"
                        disabled={!link.url || link.active || isLoading}
                        onClick={() => handlePageClick(link.url || null)}
                        sx={{
                          minWidth: 36,
                          height: 36,
                          ...(link.active && {
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            "&:hover": {
                              bgcolor: "primary.dark",
                            },
                          }),
                        }}
                        aria-label={`الصفحة ${pageNum}`}
                        aria-current={link.active ? "page" : undefined}
                      >
                        {pageNum}
                      </IconButton>
                    );
                  })
                  .filter(Boolean) // Remove null entries
              : null}

            {/* Next Page */}
            {nextPageUrl && (
              <IconButton
                size="small"
                disabled={!nextPageUrl || isLoading}
                onClick={() => handlePageClick(nextPageUrl)}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft />
              </IconButton>
            )}

            {/* Last Page */}
            {lastPageUrl && (
              <IconButton
                size="small"
                disabled={currentPage === lastPage || isLoading}
                onClick={() => handlePageClick(lastPageUrl)}
                aria-label="الصفحة الأخيرة"
              >
                <LastPage />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {items.length > 0 ? (
          <Stack spacing={2}>
            {items.map((item, index) => {
              // Calculate the actual item number considering pagination
              // Laravel 'from' is 1-indexed, so item number = from + index
              // But PurchaseItemCard displays index + 1, so we pass (from + index - 1)
              const itemNumber = from > 0 ? from + index - 1 : index;
              return (
                <PurchaseItemCard
                  key={item.id}
                  item={item}
                  index={itemNumber}
                  totalItems={total}
                  productUnits={productUnits}
                  isReadOnly={isReadOnly}
                  isDeleting={isDeleting}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              );
            })}
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
      </CardContent>
    </Card>
  );
};

export default PurchaseItemsList;
