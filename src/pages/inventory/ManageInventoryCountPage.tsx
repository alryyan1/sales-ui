import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Activity,
  AlertTriangle,
  Check,
  CheckCheck,
  Clock,
  ClipboardList,
  Loader2,
  Package,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

import { useLanguage } from "@/context/LanguageContext";
import inventoryCountService, { InventoryCountItem } from "@/services/inventoryCountService";
import productService from "@/services/productService";
import InlineCreateInventoryCountItem from "@/components/inventory/InlineCreateInventoryCountItem";
import { ProductImage } from "@/components/products/ProductImage";

const STATUS_BADGE: Record<string, "secondary" | "info" | "warning" | "success" | "destructive"> = {
  draft: "secondary",
  in_progress: "info",
  completed: "warning",
  approved: "success",
  rejected: "destructive",
};

type PendingAction = "approve" | "reject" | null;

const ManageInventoryCountPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { direction } = useLanguage();
  const { t } = useTranslation("inventory");
  const { t: tManage } = useTranslation("inventoryCountManage");
  const { t: tCommon } = useTranslation("common");

  const STATUS_LABEL: Record<string, string> = {
    draft: tManage("statusDraft"),
    in_progress: tManage("statusInProgress"),
    completed: tManage("statusCompleted"),
    approved: tManage("statusApproved"),
    rejected: tManage("statusRejected"),
  };

  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [localQuantities, setLocalQuantities] = useState<Record<number, string>>({});
  const [savingItems, setSavingItems] = useState<Record<number, boolean>>({});
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const debounceTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const { data: count, isLoading } = useQuery({
    queryKey: ["inventory-count", id],
    queryFn: () => inventoryCountService.getInventoryCount(Number(id)),
    enabled: !!id,
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => productService.getProducts(1, "", "name", "asc", 1000),
  });

  const invalidateCount = () => queryClient.invalidateQueries({ queryKey: ["inventory-count", id] });

  const addItemMutation = useMutation({
    mutationFn: (data: { product_id: number; actual_quantity?: number }) =>
      inventoryCountService.addCountItem(Number(id), data),
    onSuccess: () => {
      toast.success(tManage("productAddedSuccess"));
      invalidateCount();
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, actual_quantity }: { itemId: number; actual_quantity: number }) =>
      inventoryCountService.updateCountItem(Number(id), itemId, { actual_quantity }),
    onSuccess: (_, { itemId }) => {
      setSavingItems((prev) => ({ ...prev, [itemId]: false }));
      invalidateCount();
    },
    onError: (error, { itemId }) => {
      setSavingItems((prev) => ({ ...prev, [itemId]: false }));
      toast.error(inventoryCountService.getErrorMessage(error));
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => inventoryCountService.deleteCountItem(Number(id), itemId),
    onSuccess: () => {
      toast.success(tManage("productDeletedSuccess"));
      invalidateCount();
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      inventoryCountService.updateInventoryCount(Number(id), { status } as never),
    onSuccess: () => {
      toast.success(tManage("statusUpdatedSuccess"));
      invalidateCount();
    },
    onError: (error) => toast.error(inventoryCountService.getErrorMessage(error)),
  });

  const approveMutation = useMutation({
    mutationFn: () => inventoryCountService.approveCount(Number(id)),
    onSuccess: () => {
      toast.success(tManage("countApprovedSuccess"));
      setPendingAction(null);
      invalidateCount();
    },
    onError: (error) => {
      setPendingAction(null);
      toast.error(inventoryCountService.getErrorMessage(error));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => inventoryCountService.rejectCount(Number(id)),
    onSuccess: () => {
      toast.success(tManage("countRejectedSuccess"));
      setPendingAction(null);
      invalidateCount();
    },
    onError: (error) => {
      setPendingAction(null);
      toast.error(inventoryCountService.getErrorMessage(error));
    },
  });

  const isActing = approveMutation.isPending || rejectMutation.isPending;

  const handleQuantityChange = (item: InventoryCountItem, value: string) => {
    setLocalQuantities((prev) => ({ ...prev, [item.id]: value }));
    if (debounceTimers.current[item.id]) clearTimeout(debounceTimers.current[item.id]);
    debounceTimers.current[item.id] = setTimeout(() => {
      const qty = Number(value);
      if (!isNaN(qty) && qty >= 0) {
        setSavingItems((prev) => ({ ...prev, [item.id]: true }));
        updateItemMutation.mutate({ itemId: item.id, actual_quantity: qty });
      }
    }, 500);
  };

  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const getDiffClass = (diff: number) =>
    diff > 0
      ? "text-green-600 dark:text-green-500"
      : diff < 0
        ? "text-red-600 dark:text-red-500"
        : "text-muted-foreground";

  const summary = useMemo(() => {
    const items = count?.items || [];
    return {
      total: items.length,
      diff: items.reduce((s, i) => s + i.difference, 0),
      withDiff: items.filter((i) => i.difference !== 0).length,
    };
  }, [count?.items]);

  const canEdit = count?.status === "draft" || count?.status === "in_progress";
  const canComplete = count?.status === "in_progress" && (count?.items?.length ?? 0) > 0;
  const canApprove = count?.status === "completed";

  const availableProducts = useMemo(
    () => products?.data?.filter((p) => !count?.items?.some((i) => i.product_id === p.id)) ?? [],
    [products?.data, count?.items]
  );

  const filteredItems = useMemo(() => {
    if (!count?.items) return [];
    if (!searchQuery.trim()) return count.items;
    const q = searchQuery.trim().toLowerCase();
    return count.items.filter(
      (i) => i.product?.name.toLowerCase().includes(q) || i.product?.sku?.toLowerCase().includes(q)
    );
  }, [count?.items, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!count) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ClipboardList className="size-10 text-muted-foreground" />
        <p className="text-lg font-medium text-foreground">{tManage("countNotFound")}</p>
        <Button variant="outline" onClick={() => navigate("/inventory/counts")}>
          {tManage("backToList")}
        </Button>
      </div>
    );
  }

  return (
    <div dir={direction} className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Header */}
        <div className="mb-6 border-b pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="mt-0.5 size-8 shrink-0"
                onClick={() => navigate("/inventory/counts")}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-foreground">
                    {tManage("countHash", { id: count.id })}
                  </h1>
                  <Badge variant={STATUS_BADGE[count.status] ?? "secondary"}>
                    {STATUS_LABEL[count.status] ?? count.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{count.warehouse?.name}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <>
                  <Button size="sm" className="gap-1.5" onClick={() => setShowInlineAdd(true)}>
                    <Plus className="size-3.5" />
                    {tCommon("add")}
                  </Button>
                  {count.status === "draft" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate("in_progress")}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Play className="size-3.5" />
                      )}
                      {tManage("startCount")}
                    </Button>
                  )}
                  {canComplete && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate("completed")}
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      {tManage("complete")}
                    </Button>
                  )}
                </>
              )}
              {canApprove && (
                <>
                  <Button
                    size="sm"
                    variant="success"
                    className="gap-1.5"
                    onClick={() => setPendingAction("approve")}
                  >
                    <Check className="size-3.5" />
                    {tManage("approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setPendingAction("reject")}
                  >
                    <X className="size-3.5" />
                    {tManage("reject")}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />
              {tManage("createdColon", { date: dayjs(count.created_at).format("YYYY-MM-DD HH:mm") })}
            </span>
            {count.started_at && (
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Play className="size-3.5" />
                {tManage("startedColon", { date: dayjs(count.started_at).format("YYYY-MM-DD HH:mm") })}
              </span>
            )}
            {count.completed_at && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                <CheckCheck className="size-3.5" />
                {tManage("completedColon", { date: dayjs(count.completed_at).format("YYYY-MM-DD HH:mm") })}
              </span>
            )}
            {count.approved_at && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-500">
                <Check className="size-3.5" />
                {tManage("approvedColon", { date: dayjs(count.approved_at).format("YYYY-MM-DD HH:mm") })}
              </span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Package className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tManage("itemUnitLabel")}</p>
              <p className="text-lg font-semibold leading-tight">{summary.total}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                summary.diff !== 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-muted"
              )}
            >
              <Activity
                className={cn("size-5", summary.diff !== 0 ? "text-red-600 dark:text-red-500" : "text-muted-foreground")}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tManage("diffLabel")}</p>
              <p className={cn("text-lg font-semibold leading-tight", getDiffClass(summary.diff))}>
                {summary.diff > 0 ? "+" : ""}
                {summary.diff}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg",
                summary.withDiff > 0 ? "bg-amber-50 dark:bg-amber-950/40" : "bg-muted"
              )}
            >
              <AlertTriangle
                className={cn("size-5", summary.withDiff > 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground")}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{tManage("withDiffLabel")}</p>
              <p className="text-lg font-semibold leading-tight">{summary.withDiff}</p>
            </div>
          </div>
        </div>

        {/* Inline add */}
        {showInlineAdd && (
          <div className="mb-4">
            <InlineCreateInventoryCountItem
              onSave={(data) => {
                addItemMutation.mutate(data);
                setShowInlineAdd(false);
              }}
              onCancel={() => setShowInlineAdd(false)}
              isLoading={addItemMutation.isPending}
              availableProducts={availableProducts}
            />
          </div>
        )}

        {/* Items table */}
        <div className="overflow-hidden rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">{tManage("productsListTitle")}</p>
              <Badge variant="outline">{filteredItems.length}</Badge>
            </div>
            <div className="relative w-56 max-w-full">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tManage("searchPlaceholder")}
                className="h-9 ps-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-12" />
                <TableHead>{t("productColumn")}</TableHead>
                <TableHead className="w-32 text-center">{tManage("expectedQuantityColumn")}</TableHead>
                <TableHead className="w-40 text-center">{tManage("actualQuantityColumn")}</TableHead>
                <TableHead className="w-24 text-center">{tManage("differenceColumn")}</TableHead>
                {canEdit && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="py-12 text-center text-muted-foreground">
                    <ClipboardList className="mx-auto mb-2 size-8 opacity-30" />
                    {tManage("noMatchingProducts")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="p-1">
                      <ProductImage imageUrl={item.product?.image_url} productName={item.product?.name} size={32} />
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{item.product?.name}</p>
                      {item.product?.sku && (
                        <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{item.expected_quantity}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <Input
                            id={`qty-${index}`}
                            type="number"
                            min={0}
                            step={0.01}
                            value={
                              localQuantities[item.id] !== undefined
                                ? localQuantities[item.id]
                                : (item.actual_quantity ?? "")
                            }
                            onChange={(e) => handleQuantityChange(item, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                document.getElementById(`qty-${index + 1}`)?.focus();
                              }
                            }}
                            placeholder="0"
                            className="h-8 w-24 text-center"
                          />
                          {savingItems[item.id] && (
                            <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      ) : (
                        <span className="text-sm">{item.actual_quantity ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className={cn("text-center text-sm font-semibold", getDiffClass(item.difference))}>
                      {item.difference > 0 ? "+" : ""}
                      {item.difference}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          disabled={deleteItemMutation.isPending}
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Approve / reject confirmation */}
      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isActing) setPendingAction(null);
        }}
      >
        <AlertDialogContent dir={direction}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "approve" ? tManage("approve") : tManage("reject")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "approve" ? tManage("confirmApprove") : tManage("confirmReject")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" disabled={isActing} onClick={() => setPendingAction(null)}>
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant={pendingAction === "approve" ? "success" : "destructive"}
              disabled={isActing}
              className="gap-2"
              onClick={() => (pendingAction === "approve" ? approveMutation.mutate() : rejectMutation.mutate())}
            >
              {isActing && <Loader2 className="size-4 animate-spin" />}
              {pendingAction === "approve" ? tManage("approve") : tManage("reject")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageInventoryCountPage;
