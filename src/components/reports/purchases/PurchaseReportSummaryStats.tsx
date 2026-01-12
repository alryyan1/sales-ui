import React from "react";
import { Package, DollarSign, TrendingUp } from "lucide-react";
import { formatNumber } from "@/constants";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SummaryStats {
  totalPurchases: number;
  totalAmount: number;
  pendingCount: number;
  averagePurchase: number;
}

interface PurchaseReportSummaryStatsProps {
  stats: SummaryStats;
}

const PurchaseReportSummaryStats: React.FC<PurchaseReportSummaryStatsProps> = ({
  stats,
}) => {
  return (
    <div className="mb-6 flex flex-wrap gap-5">
      {/* Total Purchases Card */}
      <div className="min-w-full flex-1 md:min-w-[240px] md:flex-[1_1_calc(33.333%-14px)]">
        <Card className="h-full border shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  عدد المشتريات
                </p>
                <div className="flex items-center text-primary">
                  <Package size={18} />
                </div>
              </div>
              <h3 className="text-3xl font-bold leading-none">
                {stats.totalPurchases}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Total Amount Card */}
      <div className="min-w-full flex-1 md:min-w-[240px] md:flex-[1_1_calc(33.333%-14px)]">
        <Card className="h-full border shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  إجمالي المبلغ
                </p>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <DollarSign size={18} />
                </div>
              </div>
              <h3 className="text-3xl font-bold leading-none">
                {formatNumber(stats.totalAmount)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Count Card */}
      <div className="min-w-full flex-1 md:min-w-[240px] md:flex-[1_1_calc(33.333%-14px)]">
        <Card
          className={cn(
            "h-full border shadow-sm",
            stats.pendingCount > 0 && "border-yellow-200 dark:border-yellow-800"
          )}
        >
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  المشتريات المعلقة
                </p>
                <div
                  className={cn(
                    "flex items-center",
                    stats.pendingCount > 0
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                  )}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <h3
                className={cn(
                  "text-3xl font-bold leading-none",
                  stats.pendingCount > 0
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {stats.pendingCount}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Purchase Value */}
      <div className="min-w-full flex-1 md:min-w-[240px] md:flex-[1_1_calc(33.333%-14px)]">
        <Card className="h-full border shadow-sm">
          <CardContent className="p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  متوسط قيمة الشراء
                </p>
              </div>
              <h3 className="text-3xl font-bold leading-none">
                {formatNumber(stats.averagePurchase)}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PurchaseReportSummaryStats;
