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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// MUI Components
import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

// Services
import purchaseService from "@/services/purchaseService";
import productService, {
  Product as ProductType,
} from "@/services/productService";
import { useSettings } from "@/context/SettingsContext";

// Subcomponents
import {
  AddItemDialog,
  PurchaseHeader,
  PurchaseItemsList,
  AddPurchaseItemData,
  ProductUnitsMap,
} from "@/components/purchases/manage-items";
import InventoryImpactDialog from "@/components/purchases/InventoryImpactDialog";
import { webUrl } from "@/constants";

const ManagePurchaseItemsPage: React.FC = () => {
  const { id: purchaseIdParam } = useParams<{ id: string }>();
  const purchaseId = purchaseIdParam ? Number(purchaseIdParam) : null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { getSetting } = useSettings();
  const showBatchNumber = getSetting("purchase_use_batch_number", true) ?? true;
  const showExpiryDate =
    !getSetting("hide_expiry_date", false) &&
    (getSetting("purchase_use_expiry_date", true) ?? true);

  // Dialog states
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [inventoryImpactDialogOpen, setInventoryImpactDialogOpen] =
    useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    newStatus: "received" | "pending" | "ordered";
    previousStatus: string;
  } | null>(null);

  // Product units mapping
  const [productUnits, setProductUnits] = useState<ProductUnitsMap>({});

  // Track which field is currently being updated (for loading state)
  const [updatingField, setUpdatingField] = useState<string | null>(null);

  // ==================== QUERIES ====================

  const {
    data: purchase,
    isLoading: loadingPurchase,
    error: purchaseError,
  } = useQuery({
    queryKey: ["purchase", purchaseId],
    queryFn: () => purchaseService.getPurchase(purchaseId!),
    enabled: !!purchaseId,
    staleTime: 0,
  });

  // Percentage Markup State (persisted in localStorage)
  const [markupPercentage, setMarkupPercentage] = useState<number>(() => {
    const saved = localStorage.getItem("purchase_markup_percentage");
    return saved ? Number(saved) : 20; // Default to 20%
  });

  const handleMarkupChange = (newValue: number) => {
    setMarkupPercentage(newValue);
    localStorage.setItem("purchase_markup_percentage", String(newValue));
  };

  // ==================== PAGINATION & SEARCH ====================
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");

  const { data: purchaseItemsData, isFetching: isLoadingItems } = useQuery({
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
      // Invalidate queries instead of manual refetch for better performance
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId] });
      queryClient.invalidateQueries({
        queryKey: ["purchaseItems", purchaseId],
      });
      setAddItemDialogOpen(false);
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  // Inline creation handler
  const handleInlineCreate = useCallback(
    async (data: AddPurchaseItemData) => {
      await addItemMutation.mutateAsync(data);
    },
    [addItemMutation],
  );

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
        updatedItemData,
      );
    },
    onSuccess: (_data, variables) => {
      toast.success("تم بنجاح", { description: "تم تحديث الصنف بنجاح" });

      // Optimistically update the cache instead of refetching
      // Update the main purchase query cache
      queryClient.setQueryData(["purchase", purchaseId], (oldData: any) => {
        if (!oldData?.items) return oldData;
        return {
          ...oldData,
          items: oldData.items.map((item: any) =>
            item.id === variables.itemId
              ? { ...item, [variables.field]: variables.value }
              : item,
          ),
        };
      });

      // Update the paginated items query cache
      queryClient.setQueryData(
        ["purchaseItems", purchaseId, page, perPage, search],
        (oldData: any) => {
          if (!oldData?.data) return oldData;
          return {
            ...oldData,
            data: oldData.data.map((item: any) =>
              item.id === variables.itemId
                ? { ...item, [variables.field]: variables.value }
                : item,
            ),
          };
        },
      );

      setUpdatingField(null); // Clear loading state
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
      setUpdatingField(null); // Clear loading state on error
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return await purchaseService.deletePurchaseItem(purchaseId!, itemId);
    },
    onSuccess: () => {
      toast.success("تم بنجاح", { description: "تم حذف الصنف بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId] });
      queryClient.invalidateQueries({
        queryKey: ["purchaseItems", purchaseId],
      });
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const addAllProductsMutation = useMutation({
    mutationFn: async () => {
      const response = await purchaseService.addAllMissingProducts(purchaseId!);
      return response.added_count;
    },
    onSuccess: (count) => {
      toast.success("تم بنجاح", { description: `تمت إضافة ${count} منتج` });
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId] });
      queryClient.invalidateQueries({
        queryKey: ["purchaseItems", purchaseId],
      });
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const deleteZeroQuantityItemsMutation = useMutation({
    mutationFn: async () => {
      const response = await purchaseService.deleteZeroQuantityItems(
        purchaseId!,
      );
      return response.deleted_count;
    },
    onSuccess: (count) => {
      toast.success("تم بنجاح", {
        description: `تم حذف ${count} صنف بكمية صفر`,
      });
      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId] });
      queryClient.invalidateQueries({
        queryKey: ["purchaseItems", purchaseId],
      });
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: {
      newStatus: "received" | "pending" | "ordered";
      previousStatus: string;
    }) => {
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
        status: data.newStatus,
        items: currentItems,
      });
    },
    onSuccess: (_response, variables) => {
      const { newStatus, previousStatus } = variables;

      // Determine inventory impact message
      let inventoryMessage = "";

      if (previousStatus !== "received" && newStatus === "received") {
        // Changing TO received - stock will be ADDED
        const totalQuantity =
          purchase?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        inventoryMessage = `تم إضافة ${totalQuantity} وحدة إلى المخزون`;
      } else if (previousStatus === "received" && newStatus !== "received") {
        // Changing FROM received - stock will be REMOVED
        const totalQuantity =
          purchase?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        inventoryMessage = `تم خصم ${totalQuantity} وحدة من المخزون`;
      } else {
        // No inventory impact (changing between pending/ordered)
        inventoryMessage = "لم يتأثر المخزون";
      }

      toast.success("تم تحديث حالة المشتريات", {
        description: inventoryMessage,
        duration: 5000,
      });

      queryClient.invalidateQueries({ queryKey: ["purchase", purchaseId] });
      queryClient.invalidateQueries({
        queryKey: ["purchaseItems", purchaseId],
      });

      // Close the dialog
      setInventoryImpactDialogOpen(false);
      setPendingStatusChange(null);
    },
    onError: (error: unknown) => {
      toast.error("خطأ", {
        description: purchaseService.getErrorMessage(error),
      });
      // Close the dialog on error
      setInventoryImpactDialogOpen(false);
      setPendingStatusChange(null);
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
      { totalCost: 0, totalSell: 0, totalItems: 0, totalQuantity: 0 },
    );
  }, [purchase?.items]);

  const isReadOnly = useMemo(
    () => purchase?.status === "received",
    [purchase?.status],
  );

  // ==================== HANDLERS ====================

  const handleItemUpdate = useCallback(
    (itemId: number, field: string, value: unknown) => {
      const updateKey = `${itemId}-${field}`;

      // Set loading state for this specific field
      setUpdatingField(updateKey);

      // Trigger update immediately (on blur from InstantTextField)
      updateItemMutation.mutate({ itemId, field, value });
    },
    [updateItemMutation],
  );

  const handleItemDelete = useCallback(
    (itemId: number) => {
      if (window.confirm("هل أنت متأكد من حذف هذا الصنف؟")) {
        deleteItemMutation.mutate(itemId);
      }
    },
    [deleteItemMutation],
  );

  const handleAddItem = useCallback(
    (data: AddPurchaseItemData) => {
      addItemMutation.mutate(data);
    },
    [addItemMutation],
  );

  // Handle status change - show dialog first
  const handleStatusChange = useCallback(
    (newStatus: "received" | "pending" | "ordered") => {
      setPendingStatusChange({
        newStatus,
        previousStatus: purchase?.status || "pending",
      });
      setInventoryImpactDialogOpen(true);
    },
    [purchase?.status],
  );

  // Confirm status change from dialog
  const handleConfirmStatusChange = useCallback(() => {
    if (pendingStatusChange) {
      updateStatusMutation.mutate(pendingStatusChange);
    }
  }, [pendingStatusChange, updateStatusMutation]);

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

  // Memoize unique product IDs to prevent unnecessary refetches
  const uniqueProductIds = useMemo(() => {
    const ids = purchase?.items?.map((i) => i.product_id) || [];
    return Array.from(new Set(ids));
  }, [purchase?.items]);

  // Track previous product IDs to prevent unnecessary refetches
  const prevProductIdsRef = useRef<string>("");

  // Load unit names for items' products only when product IDs actually change
  useEffect(() => {
    if (uniqueProductIds.length === 0) {
      setProductUnits({});
      prevProductIdsRef.current = "";
      return;
    }

    // Create a stable string representation of the IDs for comparison
    const currentIdsString = uniqueProductIds.sort().join(",");

    // Only fetch if the IDs have actually changed
    if (currentIdsString === prevProductIdsRef.current) {
      return;
    }

    prevProductIdsRef.current = currentIdsString;
    let cancelled = false;

    (async () => {
      try {
        const products =
          await productService.getProductsByIds(uniqueProductIds);
        if (cancelled) return;

        const map: ProductUnitsMap = {};
        products.forEach((p: ProductType) => {
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

    return () => {
      cancelled = true;
    };
  }, [uniqueProductIds]);

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
        onStatusChange={handleStatusChange}
        isAddAllPending={addAllProductsMutation.isPending}
        isDeleteZeroPending={deleteZeroQuantityItemsMutation.isPending}
        isStatusPending={updateStatusMutation.isPending}
        summaryDialogOpen={summaryDialogOpen}
        onOpenSummaryDialog={() => setSummaryDialogOpen(true)}
        onCloseSummaryDialog={() => setSummaryDialogOpen(false)}
        onExportPdf={() => {
          // Open the backend-generated PDF in a new tab
          const pdfUrl = `${webUrl}/purchases/${purchaseId}/export/pdf`;
          window.open(pdfUrl, "_blank");
        }}
        markupPercentage={markupPercentage}
        onMarkupChange={handleMarkupChange}
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
        updatingField={updatingField}
        // Laravel Pagination
        pagination={purchaseItemsData || null}
        searchQuery={search}
        isLoading={isLoadingItems}
        onPageChange={setPage}
        onPerPageChange={(newPerPage) => {
          setPerPage(newPerPage);
          setPage(1); // Reset to page 1 on perPage change
        }}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1); // Reset to page 1 on search
        }}
        // Inline creation
        onInlineCreate={handleInlineCreate}
        isCreating={addItemMutation.isPending}
        markupPercentage={markupPercentage}
        currency={purchase?.currency}
        showBatchNumber={showBatchNumber}
        showExpiryDate={showExpiryDate}
      />

      {/* Inventory Impact Dialog */}
      <InventoryImpactDialog
        isOpen={inventoryImpactDialogOpen}
        onClose={() => {
          setInventoryImpactDialogOpen(false);
          setPendingStatusChange(null);
        }}
        onConfirm={handleConfirmStatusChange}
        items={purchase?.items || []}
        previousStatus={pendingStatusChange?.previousStatus || ""}
        newStatus={pendingStatusChange?.newStatus || "pending"}
        isLoading={updateStatusMutation.isPending}
      />
    </Box>
  );
};

export default ManagePurchaseItemsPage;
