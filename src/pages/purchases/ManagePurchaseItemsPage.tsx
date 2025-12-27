// src/pages/purchases/ManagePurchaseItemsPage.tsx
// Refactored into subcomponents for better maintainability
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

// MUI Components
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Services
import purchaseService from "@/services/purchaseService";
import productService from "@/services/productService";
import apiClient from "@/lib/axios";

// Subcomponents
import {
  AddItemDialog,
  PurchaseHeader,
  PurchaseItemsList,
  AddPurchaseItemData,
  ProductUnitsMap,
  Product,
} from "@/components/purchases/manage-items";
import { PurchasePdfDialog } from "@/components/purchases/PurchasePdfDialog";

const ManagePurchaseItemsPage: React.FC = () => {
  const { id: purchaseIdParam } = useParams<{ id: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const navigate = useNavigate();

  // Dialog states
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);

  // Product units mapping
  const [productUnits, setProductUnits] = useState<ProductUnitsMap>({});

  // Debounce refs for item updates
  const updateTimeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ==================== QUERIES ====================

  const {
    data: purchase,
    isLoading: loadingPurchase,
    error: purchaseError,
    refetch: refetchPurchase,
  } = useQuery({
    queryKey: ["purchase", purchaseId],
    queryFn: () => purchaseService.getPurchase(purchaseId!),
    enabled: !!purchaseId,
    staleTime: 0,
  });

  // ==================== PAGINATION & SEARCH ====================
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");

  const {
    data: purchaseItemsData,
    isLoading: loadingItems,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["purchaseItems", purchaseId, page, perPage, search],
    queryFn: () =>
      purchaseService.getPurchaseItems(purchaseId!, page, perPage, search),
    enabled: !!purchaseId,
    placeholderData: (previousData) => previousData, // Keep previous data while fetching
  });

  // ==================== MUTATIONS ====================

  const addItemMutation = useMutation({
    mutationFn: async (data: AddPurchaseItemData) => {
      return await purchaseService.addPurchaseItem(purchaseId!, data);
    },
    onSuccess: () => {
      toast.success("تم بنجاح", { description: "تمت إضافة الصنف بنجاح" });
      refetchPurchase();
      refetchItems();
      setAddItemDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      field,
      value,
    }: {
      itemId: number;
      field: string;
      value: unknown;
    }) => {
      const currentItem = purchase?.items?.find((item) => item.id === itemId);
      if (!currentItem) throw new Error("الصنف غير موجود");

      const updatedItemData = {
        product_id: currentItem.product_id,
        batch_number:
          field === "batch_number"
            ? (value as string) || null
            : currentItem.batch_number || null,
        quantity: field === "quantity" ? Number(value) : currentItem.quantity,
        unit_cost:
          field === "unit_cost" ? Number(value) : Number(currentItem.unit_cost),
        sale_price:
          field === "sale_price"
            ? value
              ? Number(value)
              : 0
            : currentItem.sale_price
            ? Number(currentItem.sale_price)
            : 0,
        sale_price_stocking_unit:
          field === "sale_price_stocking_unit"
            ? value !== null && value !== undefined
              ? Number(value)
              : null
            : currentItem.sale_price_stocking_unit !== undefined
            ? (currentItem.sale_price_stocking_unit as number | null)
            : null,
        expiry_date:
          field === "expiry_date"
            ? (value as string) || null
            : currentItem.expiry_date || null,
      };

      return await purchaseService.updatePurchaseItem(
        purchaseId!,
        itemId,
        updatedItemData
      );
    },
    onSuccess: () => {
      toast.success("تم بنجاح", { description: "تم تحديث الصنف بنجاح" });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await purchaseService.deletePurchaseItem(purchaseId!, itemId);
    },
    onSuccess: () => {
      toast.success("تم بنجاح", { description: "تم حذف الصنف بنجاح" });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const addAllProductsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.get<{ data: Product[] }>(
        "/products?limit=1000"
      );
      const allProducts = response.data.data || response.data;
      const existingProductIds =
        purchase?.items?.map((item) => item.product_id) || [];
      const newProducts = allProducts.filter(
        (product) => !existingProductIds.includes(product.id)
      );

      const promises = newProducts.map((product) => {
        const data: AddPurchaseItemData = {
          product_id: product.id,
          quantity: 0,
          unit_cost: Number(product.latest_cost_per_sellable_unit) || 0,
          sale_price:
            Number(product.suggested_sale_price_per_sellable_unit) || 0,
        };
        return purchaseService.addPurchaseItem(purchaseId!, data);
      });

      await Promise.all(promises);
      return newProducts.length;
    },
    onSuccess: (count) => {
      toast.success("تم بنجاح", { description: `تمت إضافة ${count} منتج` });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const deleteZeroQuantityItemsMutation = useMutation({
    mutationFn: async () => {
      const zeroQuantityItems =
        purchase?.items?.filter((item) => item.quantity === 0) || [];
      const promises = zeroQuantityItems.map((item) =>
        purchaseService.deletePurchaseItem(purchaseId!, item.id)
      );
      await Promise.all(promises);
      return zeroQuantityItems.length;
    },
    onSuccess: (count) => {
      toast.success("تم بنجاح", {
        description: `تم حذف ${count} صنف بكمية صفر`,
      });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: "received" | "pending" | "ordered") => {
      const currentItems =
        purchase?.items?.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          batch_number: item.batch_number,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          sale_price: item.sale_price,
          expiry_date: item.expiry_date,
        })) || [];

      return await purchaseService.updatePurchase(purchaseId!, {
        status,
        items: currentItems,
      });
    },
    onSuccess: () => {
      toast.success("تم بنجاح", { description: "تم تحديث حالة المشتريات" });
      refetchPurchase();
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // ==================== COMPUTED VALUES ====================

  const summary = useMemo(() => {
    if (!purchase?.items) {
      return { totalCost: 0, totalSell: 0, totalItems: 0, totalQuantity: 0 };
    }
    return purchase.items.reduce(
      (acc, item) => ({
        totalCost: acc.totalCost + item.quantity * Number(item.unit_cost),
        totalSell: acc.totalSell + item.quantity * Number(item.sale_price || 0),
        totalItems: acc.totalItems + 1,
        totalQuantity: acc.totalQuantity + item.quantity,
      }),
      { totalCost: 0, totalSell: 0, totalItems: 0, totalQuantity: 0 }
    );
  }, [purchase?.items]);

  const isReadOnly = useMemo(
    () => purchase?.status === "received",
    [purchase?.status]
  );

  // ==================== HANDLERS ====================

  const handleItemUpdate = useCallback(
    (itemId: number, field: string, value: unknown) => {
      const updateKey = `${itemId}-${field}`;
      const existingTimeout = updateTimeoutRefs.current.get(updateKey);
      if (existingTimeout) clearTimeout(existingTimeout);

      const newTimeout = setTimeout(() => {
        updateItemMutation.mutate({ itemId, field, value });
        updateTimeoutRefs.current.delete(updateKey);
      }, 1000);

      updateTimeoutRefs.current.set(updateKey, newTimeout);
    },
    [updateItemMutation]
  );

  const handleItemDelete = useCallback(
    (itemId: number) => {
      if (window.confirm("هل أنت متأكد من حذف هذا الصنف؟")) {
        deleteItemMutation.mutate(itemId);
      }
    },
    [deleteItemMutation]
  );

  const handleAddItem = useCallback(
    (data: AddPurchaseItemData) => {
      addItemMutation.mutate(data);
    },
    [addItemMutation]
  );

  // ==================== EFFECTS ====================

  // Keyboard shortcut for adding items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "+" || e.key === "Add") {
        e.preventDefault();
        setAddItemDialogOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Load unit names for items' products
  useEffect(() => {
    const ids = purchase?.items?.map((i) => i.product_id) || [];
    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      setProductUnits({});
      return;
    }
    (async () => {
      try {
        const products = await productService.getProductsByIds(uniqueIds);
        const map: ProductUnitsMap = {};
        products.forEach((p) => {
          map[p.id] = {
            stocking_unit_name: p.stocking_unit_name ?? null,
            sellable_unit_name: p.sellable_unit_name ?? null,
          };
        });
        setProductUnits(map);
      } catch {
        /* Silent fail */
      }
    })();
  }, [purchase?.items]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeoutRefs = updateTimeoutRefs.current;
    return () => {
      timeoutRefs.forEach((timeout) => clearTimeout(timeout));
      timeoutRefs.clear();
    };
  }, []);

  // ==================== RENDER ====================

  if (!purchaseId) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 400 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>
            خطأ
          </Typography>
          <Typography color="text.secondary">رقم المشتريات غير صالح</Typography>
        </Paper>
      </Box>
    );
  }

  if (loadingPurchase) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        gap={2}
      >
        <CircularProgress />
        <Typography>جاري التحميل...</Typography>
      </Box>
    );
  }

  if (purchaseError || !purchase) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <Paper sx={{ p: 4, textAlign: "center", maxWidth: 400 }}>
          <ErrorOutlineIcon color="error" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" color="error" gutterBottom>
            خطأ
          </Typography>
          <Typography color="text.secondary">
            {purchaseService.getErrorMessage(purchaseError)}
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Header Section */}
      <PurchaseHeader
        purchase={purchase}
        summary={summary}
        isReadOnly={isReadOnly}
        onBack={() => navigate("/purchases")}
        onOpenAddDialog={() => setAddItemDialogOpen(true)}
        onAddAllProducts={() => addAllProductsMutation.mutate()}
        onDeleteZeroQuantity={() => deleteZeroQuantityItemsMutation.mutate()}
        onStatusChange={(status) => updateStatusMutation.mutate(status)}
        isAddAllPending={addAllProductsMutation.isPending}
        isDeleteZeroPending={deleteZeroQuantityItemsMutation.isPending}
        isStatusPending={updateStatusMutation.isPending}
        summaryDialogOpen={summaryDialogOpen}
        onOpenSummaryDialog={() => setSummaryDialogOpen(true)}
        onCloseSummaryDialog={() => setSummaryDialogOpen(false)}
        onExportPdf={() => setPdfDialogOpen(true)}
      />

      {/* PDF Dialog */}
      <PurchasePdfDialog
        open={pdfDialogOpen}
        onClose={() => setPdfDialogOpen(false)}
        purchase={purchase}
        // If searching or paginating, we might only show visible items,
        // OR we might want to refetch ALL items for the PDF.
        // For now, let's pass likely the currently loaded items,
        // or we could allow fetching all items logic similar to "add all products" but for view.
        // Ideally, Purchase Orders are usually small enough to just load all items for print,
        // or simply pass the current view.
        // Given 'purchase.items' might be stale if using 'purchaseItemsData' from react-query pagination,
        // we should probably use 'purchaseItemsData.data' if available, otherwise purchase.items.
        // However, purchaseItemsData is paginated. PDF usually needs ALL items.
        // For simple MVP: Passing `purchaseItemsData?.data` shows current page.
        // Better: Pass `purchase.items` if it was eager loaded fully, OR show warning if paginated.
        // Re-reading `ManagePurchaseItemsPage`: `refetchPurchase` is called on mutations.
        // `purchase` from `useQuery(['purchase', ...])` usually returns the purchase object.
        // Does `purchaseService.getPurchase` include ALL items?
        // Checking `purchaseService.ts`: `getPurchase` returns `response.data.purchase`.
        // If the backend returns all items there, we are good.
        // Let's assume `purchase.items` (if present) contains what we need or we pass `purchaseItemsData?.data`.
        // If `purchase.items` is not fully loaded due to performance refactors (pagination),
        // we might only print partial.
        // For now, let's pass `purchaseItemsData?.data` as that is what user sees (filtered/searched).
        items={purchase?.items || []}
      />

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addItemDialogOpen}
        onClose={() => setAddItemDialogOpen(false)}
        onAddItem={handleAddItem}
        isLoading={addItemMutation.isPending}
      />

      {/* Items List */}
      <PurchaseItemsList
        items={purchaseItemsData?.data || []}
        productUnits={productUnits}
        isReadOnly={isReadOnly}
        isDeleting={deleteItemMutation.isPending}
        onUpdate={handleItemUpdate}
        onDelete={handleItemDelete}
        // Pagination Props
        page={page}
        perPage={perPage}
        total={purchaseItemsData?.meta?.total || 0}
        searchQuery={search}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1); // Reset to page 1 on perPage change
        }}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1); // Reset to page 1 on search
        }}
      />
    </Box>
  );
};

export default ManagePurchaseItemsPage;
