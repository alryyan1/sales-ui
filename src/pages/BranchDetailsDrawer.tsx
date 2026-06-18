import React, { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Phone,
  Users,
  TrendingUp,
  FileText,
  CircleDollarSign,
  AlertCircle,
  UserPlus,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart2,
  ShoppingCart,
  Timer,
} from "lucide-react";
import apiClient from "@/lib/axios";
import { formatCurrency, formatNumber } from "@/constants";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BranchDetailsData {
  branch: {
    id: number;
    name: string;
    address: string | null;
    contact_info: string | null;
    is_active: boolean;
    employees_count: number;
  };
  summary: {
    total_sales: number;
    total_returns: number;
    total_profit: number;
    invoices_count: number;
    avg_invoice: number;
  };
  customers: {
    total_clients: number;
    new_clients_count: number;
    outstanding_debt: number;
  };
  purchases: {
    total: number;
    cash: number;
    bank: number;
    deferred: number;
  };
  employees: Array<{ id: number; name: string; total_sales: number; invoices_count: number }>;
  recent_invoices: Array<{
    id: number;
    number: string | null;
    sale_date: string;
    client_name: string;
    total_amount: number;
    paid_amount: number;
  }>;
}

interface Props {
  open: boolean;
  onClose: () => void;
  warehouseId: number | null;
  startDate: string;
  endDate: string;
  branchName?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SummaryMini: React.FC<{
  label: string; value: string; icon: React.ReactNode;
  color: string; loading?: boolean;
}> = ({ label, value, icon, color, loading }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border ${color}`}>
    <div className="flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{label}</p>
      {loading
        ? <Skeleton className="h-5 w-20 mt-1 dark:bg-gray-700" />
        : <p className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">{value}</p>
      }
    </div>
  </div>
);

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string }> = ({ icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</span>
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const BranchDetailsDrawer: React.FC<Props> = ({
  open, onClose, warehouseId, startDate, endDate, branchName
}) => {
  const [data, setData]       = useState<BranchDetailsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchDetails = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true); setError(null);
    try {
      const q = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await apiClient.get<{ data: BranchDetailsData }>(
        `/dashboard/branch-details/${warehouseId}?${q}`
      );
      setData(r.data.data);
    } catch {
      setError("تعذّر تحميل بيانات الفرع");
    } finally {
      setLoading(false);
    }
  }, [warehouseId, startDate, endDate]);

  useEffect(() => {
    if (open && warehouseId) fetchDetails();
  }, [open, warehouseId, fetchDetails]);

  const d = data;
  const topEmpSales = d?.employees[0]?.total_sales ?? 1;

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <SheetContent
        side="left"
        className="w-full sm:max-w-[640px] p-0 overflow-y-auto bg-gray-50 dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800"
        dir="rtl"
      >
        {/* ── Header ── */}
        <SheetHeader className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <BarChart2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {d?.branch.name ?? branchName ?? "الفرع"}
                </SheetTitle>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  {startDate} — {endDate}
                </p>
              </div>
            </div>
            {!loading && d && (
              <Badge className={`flex-shrink-0 text-[10px] font-semibold border-0 ${
                d.branch.is_active
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}>
                {d.branch.is_active ? "نشط" : "غير نشط"}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* ── Body ── */}
        <div className="px-5 py-4 space-y-6">

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Branch Info */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-2.5">
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-full dark:bg-gray-800" />)}
              </div>
            ) : d && (
              <>
                {d.branch.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-300">{d.branch.address}</span>
                  </div>
                )}
                {d.branch.contact_info && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-600 dark:text-gray-300">{d.branch.contact_info}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">{d.branch.employees_count}</span> موظف مسجّل
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Summary KPIs */}
          <div>
            <SectionTitle icon={<TrendingUp className="h-4 w-4 text-indigo-500" />} title="ملخص الأداء" />
            <div className="grid grid-cols-2 gap-2.5">
              <SummaryMini label="إجمالي المبيعات" value={formatCurrency(d?.summary.total_sales ?? 0)}
                icon={<CircleDollarSign className="h-4 w-4 text-blue-500" />}
                color="border-blue-100 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-900/30"
                loading={loading} />
              <SummaryMini label="صافي المبيعات" value={formatCurrency(d?.summary.total_profit ?? 0)}
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
                color="border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900/30"
                loading={loading} />
              <SummaryMini label="عدد الفواتير" value={formatNumber(d?.summary.invoices_count ?? 0)}
                icon={<FileText className="h-4 w-4 text-amber-500" />}
                color="border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30"
                loading={loading} />
              <SummaryMini label="متوسط الفاتورة" value={formatCurrency(d?.summary.avg_invoice ?? 0)}
                icon={<BarChart2 className="h-4 w-4 text-purple-500" />}
                color="border-purple-100 bg-purple-50/50 dark:bg-purple-900/10 dark:border-purple-900/30"
                loading={loading} />
            </div>
            {!loading && d && d.summary.total_returns > 0 && (
              <p className="mt-2 text-[11px] text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                إجمالي المردودات: {formatCurrency(d.summary.total_returns)}
              </p>
            )}
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Customers */}
          <div>
            <SectionTitle icon={<Users className="h-4 w-4 text-purple-500" />} title="العملاء" />

            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {[
                { label: "عدد العملاء", value: formatNumber(d?.customers.total_clients ?? 0), icon: <Users className="h-3.5 w-3.5 text-purple-500" />, color: "text-purple-600" },
                { label: "عملاء جدد", value: formatNumber(d?.customers.new_clients_count ?? 0), icon: <UserPlus className="h-3.5 w-3.5 text-blue-500" />, color: "text-blue-600" },
                { label: "مديونية العملاء", value: formatCurrency(d?.customers.outstanding_debt ?? 0), icon: <CreditCard className="h-3.5 w-3.5 text-red-500" />, color: "text-red-500" },
              ].map((item, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-center">
                  <div className="flex justify-center mb-1">{item.icon}</div>
                  {loading
                    ? <Skeleton className="h-5 w-12 mx-auto dark:bg-gray-800" />
                    : <p className={`text-sm font-bold tabular-nums ${item.color}`}>{item.value}</p>
                  }
                  <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
                </div>
              ))}
            </div>

          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Purchases */}
          <div>
            <SectionTitle icon={<ShoppingCart className="h-4 w-4 text-violet-500" />} title="ملخص المشتريات" />
            <div className="grid grid-cols-2 gap-2.5">
              <SummaryMini label="إجمالي المشتريات" value={formatCurrency(d?.purchases.total ?? 0)}
                icon={<ShoppingCart className="h-4 w-4 text-violet-500" />}
                color="border-violet-100 bg-violet-50/50 dark:bg-violet-900/10 dark:border-violet-900/30"
                loading={loading} />
              <SummaryMini label="غير مسدَّد (آجل)" value={formatCurrency(d?.purchases.deferred ?? 0)}
                icon={<Timer className="h-4 w-4 text-red-500" />}
                color="border-red-100 bg-red-50/50 dark:bg-red-900/10 dark:border-red-900/30"
                loading={loading} />
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Employees */}
          <div>
            <SectionTitle icon={<Users className="h-4 w-4 text-blue-500" />} title="أداء الموظفين" />
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full dark:bg-gray-800" />)}
                </div>
              ) : !d?.employees.length ? (
                <p className="text-xs text-gray-400 text-center py-4">لا يوجد موظفون مسجّلون في هذا الفرع</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100 dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">الموظف</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">المبيعات</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">الفواتير</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">الحصة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.employees.map((emp, i) => {
                      const share = topEmpSales > 0 ? Math.round((emp.total_sales / topEmpSales) * 100) : 0;
                      return (
                        <TableRow key={emp.id} className="border-gray-50 dark:border-gray-800/60 text-xs hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0
                                ${i===0 ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400"
                                        : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                                {emp.name.charAt(0)}
                              </div>
                              <span className="font-medium text-gray-700 dark:text-gray-200 truncate max-w-[120px]">{emp.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-600 dark:text-gray-300 tabular-nums py-3">{formatCurrency(emp.total_sales)}</TableCell>
                          <TableCell className="text-gray-400 tabular-nums py-3">{formatNumber(emp.invoices_count)}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${i===0 ? "bg-indigo-500" : "bg-gray-400"}`} style={{ width: `${share}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400 tabular-nums">{share}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <Separator className="dark:bg-gray-800" />

          {/* Recent Invoices */}
          <div>
            <SectionTitle icon={<Clock className="h-4 w-4 text-amber-500" />} title="آخر الفواتير" />
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {loading ? (
                <div className="p-3 space-y-2">
                  {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full dark:bg-gray-800" />)}
                </div>
              ) : !d?.recent_invoices.length ? (
                <p className="text-xs text-gray-400 text-center py-4">لا توجد فواتير</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100 dark:border-gray-800 hover:bg-transparent">
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">#</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">العميل</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">التاريخ</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">الإجمالي</TableHead>
                      <TableHead className="text-right text-[10px] font-semibold text-gray-400 uppercase tracking-wide py-2">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.recent_invoices.map((inv) => {
                      const remaining = inv.total_amount - inv.paid_amount;
                      const isPaid = remaining <= 0.01;
                      return (
                        <TableRow key={inv.id} className="border-gray-50 dark:border-gray-800/60 text-xs hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                          <TableCell className="text-gray-400 tabular-nums py-2.5 font-mono">
                            {inv.number ?? `#${inv.id}`}
                          </TableCell>
                          <TableCell className="font-medium text-gray-700 dark:text-gray-200 py-2.5 max-w-[100px] truncate">{inv.client_name}</TableCell>
                          <TableCell className="text-gray-400 py-2.5 tabular-nums">{inv.sale_date}</TableCell>
                          <TableCell className="font-semibold text-gray-600 dark:text-gray-300 tabular-nums py-2.5">{formatCurrency(inv.total_amount)}</TableCell>
                          <TableCell className="py-2.5">
                            {isPaid ? (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" />
                                <span className="text-[10px] font-semibold">مسدَّد</span>
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-500">
                                <XCircle className="h-3 w-3" />
                                <span className="text-[10px] font-semibold">{formatCurrency(remaining)}</span>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          {/* Spacer */}
          <div className="h-4" />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BranchDetailsDrawer;
