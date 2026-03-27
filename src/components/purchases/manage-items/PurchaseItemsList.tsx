// src/components/purchases/manage-items/PurchaseItemsList.tsx
import React, { useMemo, useState, useEffect } from "react";
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
  Tooltip,
  Button,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import {
  ChevronLeft,
  ChevronRight,
  FirstPage,
  LastPage,
} from "@mui/icons-material";
import { Plus } from "lucide-react";

import PurchaseItemsTable from "./PurchaseItemsTable";
import { PurchaseItem } from "@/services/purchaseService";
import { ProductUnitsMap, AddPurchaseItemData } from "./types";
import { PaginatedResponse } from "@/services/clientService";

interface PurchaseItemsListProps {
  items: PurchaseItem[];
  productUnits: ProductUnitsMap;
  isReadOnly: boolean;
  isDeleting: boolean;
  onUpdate: (itemId: number, field: string, value: unknown) => void;
  onDelete: (itemId: number) => void;
  updatingField: string | null; // Track which field is being updated
  // Pagination props - using Laravel pagination structure
  pagination: PaginatedResponse<PurchaseItem> | null;
  searchQuery: string;
  isLoading?: boolean;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
  onSearchChange: (query: string) => void;
  // Inline creation props
  onInlineCreate?: (data: AddPurchaseItemData) => Promise<void>;
  isCreating?: boolean;
  markupPercentage?: number;
  currency?: string;
  showBatchNumber?: boolean;
  showExpiryDate?: boolean;
}

import InlineCreatePurchaseItem from "./InlineCreatePurchaseItem";

const PurchaseItemsList: React.FC<PurchaseItemsListProps> = ({
  items,
  productUnits,
  isReadOnly,
  isDeleting,
  onUpdate,
  onDelete,
  updatingField,
  pagination,
  searchQuery,
  isLoading = false,
  onPageChange,
  onPerPageChange,
  onSearchChange,
  onInlineCreate,
  isCreating = false,
  markupPercentage = 20,
  currency,
  showBatchNumber = true,
  showExpiryDate = true,
}) => {
  const [showInlineCreate, setShowInlineCreate] = useState(false);

  // Add keyboard shortcut for "+" key to toggle inline create
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if "+" key is pressed (handles both numpad and regular +)
      if (
        (e.key === "+" || e.key === "=") &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        // Don't trigger if user is typing in an input field
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        e.stopPropagation(); // Stop the event from bubbling up to prevent dialog from opening
        setShowInlineCreate((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress, true); // Use capture phase
    return () => window.removeEventListener("keydown", handleKeyPress, true);
  }, []);

  // Memoize pagination calculations to prevent recalculation on every render
  const paginationData = useMemo(() => {
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

    return {
      total,
      currentPage,
      perPage,
      from,
      to,
      lastPage,
      links,
      firstPageUrl,
      lastPageUrl,
      prevPageUrl,
      nextPageUrl,
    };
  }, [pagination, items.length]);

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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="h6">
              أصناف المشتريات ({paginationData.total})
            </Typography>
            {onInlineCreate && !isReadOnly && (
              <Button
                size="small"
                variant="contained"
                startIcon={<Plus size={20} />}
                onClick={() => setShowInlineCreate(!showInlineCreate)}
                color="primary"
              >
                اضافه صنف
              </Button>
            )}
          </Box>
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
          sx={{direction:'ltr'}}
        >
          {/* Rows Per Page Selector */}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>صفوف لكل صفحة</InputLabel>
            <Select
              value={paginationData.perPage}
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
            عرض {paginationData.from} إلى {paginationData.to} من{" "}
            {paginationData.total} نتائج
          </Typography>

          {/* Laravel Pagination Links */}
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexWrap="wrap"
          >
            {/* First Page */}
            {paginationData.firstPageUrl && (
              <IconButton
                size="small"
                disabled={paginationData.currentPage === 1 || isLoading}
                onClick={() => handlePageClick(paginationData.firstPageUrl)}
                aria-label="الصفحة الأولى"
              >
                <FirstPage />
              </IconButton>
            )}

            {/* Previous Page */}
            {paginationData.prevPageUrl && (
              <IconButton
                size="small"
                disabled={!paginationData.prevPageUrl || isLoading}
                onClick={() => handlePageClick(paginationData.prevPageUrl)}
                aria-label="الصفحة السابقة"
              >
                <ChevronRight />
              </IconButton>
            )}

            {/* Page Numbers from Laravel links */}
            {Array.isArray(paginationData.links) &&
            paginationData.links.length > 0
              ? paginationData.links
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
            {paginationData.nextPageUrl && (
              <IconButton
                size="small"
                disabled={!paginationData.nextPageUrl || isLoading}
                onClick={() => handlePageClick(paginationData.nextPageUrl)}
                aria-label="الصفحة التالية"
              >
                <ChevronLeft />
              </IconButton>
            )}

            {/* Last Page */}
            {paginationData.lastPageUrl && (
              <IconButton
                size="small"
                disabled={
                  paginationData.currentPage === paginationData.lastPage ||
                  isLoading
                }
                onClick={() => handlePageClick(paginationData.lastPageUrl)}
                aria-label="الصفحة الأخيرة"
              >
                <LastPage />
              </IconButton>
            )}
          </Stack>
        </Stack>

        {/* Inline Creation Row */}
        {showInlineCreate && onInlineCreate && !isReadOnly && (
          <InlineCreatePurchaseItem
            onSave={async (data) => {
              await onInlineCreate(data);
              // Keep form open for adding more items
            }}
            onCancel={() => setShowInlineCreate(false)}
            isLoading={isCreating}
            markupPercentage={markupPercentage}
            showBatchNumber={showBatchNumber}
            showExpiryDate={showExpiryDate}
          />
        )}

        {items.length > 0 ? (
          <PurchaseItemsTable
            items={items}
            productUnits={productUnits}
            isReadOnly={isReadOnly}
            isDeleting={isDeleting}
            onUpdate={onUpdate}
            onDelete={onDelete}
            updatingField={updatingField}
            startIndex={paginationData.from > 0 ? paginationData.from - 1 : 0}
            totalCount={paginationData.total}
            currency={currency}
            showBatchNumber={showBatchNumber}
            showExpiryDate={showExpiryDate}
          />
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

export default React.memo(PurchaseItemsList);
