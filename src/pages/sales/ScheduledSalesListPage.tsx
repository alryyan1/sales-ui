// src/pages/sales/ScheduledSalesListPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Plus, RefreshCw, Search, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuthorization } from "@/hooks/useAuthorization";
import scheduledSaleService, {
  ScheduledSale,
  ScheduledSaleStatus,
} from "@/services/scheduledSaleService";

const STATUS_VARIANT: Record<
  ScheduledSaleStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  processing: "outline",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
};

export default function ScheduledSalesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthorization();
  const { t } = useTranslation("scheduledSales");

  const canManage = hasPermission("جدولة الفواتير");

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<ScheduledSaleStatus | "all">("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const listQuery = useQuery({
    queryKey: ["scheduled-sales", page, debouncedSearch, status],
    queryFn: () =>
      scheduledSaleService.getScheduledSales({
        page,
        per_page: 20,
        search: debouncedSearch || undefined,
        status: status === "all" ? undefined : status,
      }),
    placeholderData: keepPreviousData,
  });

  const rows = listQuery.data?.data ?? [];
  const isLoading = listQuery.isLoading;

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["scheduled-sales"] });

  const cancelMutation = useMutation({
    mutationFn: scheduledSaleService.cancelScheduledSale,
    onSuccess: () => {
      toast.success(t("list.cancelSuccess"));
      invalidate();
    },
    onError: () => toast.error(t("list.actionError")),
  });

  const retryMutation = useMutation({
    mutationFn: scheduledSaleService.retryScheduledSale,
    onSuccess: () => {
      toast.success(t("list.retrySuccess"));
      invalidate();
    },
    onError: () => toast.error(t("list.actionError")),
  });

  const resendMutation = useMutation({
    mutationFn: scheduledSaleService.resendWhatsapp,
    onSuccess: () => {
      toast.success(t("list.resendSuccess"));
      invalidate();
    },
    onError: () => toast.error(t("list.actionError")),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t("list.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("list.pageSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => listQuery.refetch()}>
            <RefreshCw className="size-4" />
          </Button>
          {canManage && (
            <Button onClick={() => navigate("/sales/scheduled/new")}>
              <Plus className="me-2 size-4" />
              {t("list.newButton")}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute start-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-8"
            placeholder={t("list.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as ScheduledSaleStatus | "all")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t("list.statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("list.statusAll")}</SelectItem>
            <SelectItem value="pending">{t("status.pending")}</SelectItem>
            <SelectItem value="processing">{t("status.processing")}</SelectItem>
            <SelectItem value="completed">{t("status.completed")}</SelectItem>
            <SelectItem value="failed">{t("status.failed")}</SelectItem>
            <SelectItem value="cancelled">{t("status.cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("list.columnCustomer")}</TableHead>
              <TableHead>{t("list.columnScheduledAt")}</TableHead>
              <TableHead>{t("list.columnStatus")}</TableHead>
              <TableHead>{t("list.columnWhatsapp")}</TableHead>
              <TableHead>{t("list.columnSale")}</TableHead>
              <TableHead className="text-end">{t("list.columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t("list.empty")}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              rows.map((row: ScheduledSale) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-medium">{row.client?.name ?? "—"}</div>
                    {row.client?.phone && (
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {row.client.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(row.scheduled_at), "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status]}>
                      {t(`status.${row.status}`)}
                    </Badge>
                    {row.status === "failed" && row.error_message && (
                      <div className="mt-1 max-w-xs text-xs text-destructive">
                        {row.error_message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div>
                      {t("list.customerLeg")}: {t(`whatsapp.${row.whatsapp_customer_status}`)}
                    </div>
                    <div className="text-muted-foreground">
                      {t("list.ownerLeg")}: {t(`whatsapp.${row.whatsapp_owner_status}`)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {row.sale ? (
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => navigate(`/sales/${row.sale!.id}`)}
                      >
                        #{row.sale.number ?? row.sale.id}
                      </Button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    {!canManage ? null : (
                      <div className="flex justify-end gap-1">
                        {row.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/sales/scheduled/${row.id}/edit`)}
                          >
                            {t("list.editAction")}
                          </Button>
                        )}
                        {(row.status === "pending" || row.status === "failed") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("list.cancelAction")}
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(row.id)}
                          >
                            <X className="size-4" />
                          </Button>
                        )}
                        {row.status === "failed" && row.sale_id === null && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={retryMutation.isPending}
                            onClick={() => retryMutation.mutate(row.id)}
                          >
                            {retryMutation.isPending ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              t("list.retryAction")
                            )}
                          </Button>
                        )}
                        {row.sale_id !== null && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("list.resendAction")}
                            disabled={resendMutation.isPending}
                            onClick={() => resendMutation.mutate(row.id)}
                          >
                            <Send className="size-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {listQuery.data && listQuery.data.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("list.prevPage")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {listQuery.data.last_page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= listQuery.data.last_page}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("list.nextPage")}
          </Button>
        </div>
      )}
    </div>
  );
}
