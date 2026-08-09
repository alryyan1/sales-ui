import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, FileText } from "lucide-react";

import apiClient from "@/lib/axios";
import { useSettings } from "@/context/SettingsContext";
import { webUrl } from "@/constants";
import { useQuery } from "@tanstack/react-query";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useShifts } from "@/hooks/useShifts";

import ReportFilters, { ReportFilterValues } from "@/components/reports/sales/ReportFilters";
import { ReportStats } from "@/components/reports/sales/ReportStats";
import { PaymentsTable } from "@/components/reports/sales/PaymentsTable";
import { LedgerSaleEditorDialog } from "@/components/clients/LedgerSaleEditorDialog";
import { useTranslation } from "react-i18next";

const SalesReportPage: React.FC = () => {
  const { t, i18n } = useTranslation(["reports"]);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);

  const { getSetting } = useSettings();
  const posMode = getSetting("pos_mode", "shift") as "shift" | "days";

  const currentFilters = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    return {
      startDate: searchParams.get("startDate") || today,
      endDate: searchParams.get("endDate") || today,
      clientId: searchParams.get("clientId") || null,
      userId: searchParams.get("userId") || null,
      shiftId: posMode === "shift" ? searchParams.get("shiftId") || null : null,
      productId: searchParams.get("productId") || null,
    };
  }, [searchParams, posMode]);

  const currentPage = useMemo(
    () => Number(searchParams.get("page") || "1"),
    [searchParams]
  );

  const { data: clientsData, isLoading: loadingClients } = useClients();
  const clients = clientsData?.data || [];

  const { data: productsData, isLoading: loadingProducts } = useProducts({ page: 1, perPage: 1000 });
  const products = productsData?.data || [];

  const { data: shifts = [], isLoading: loadingShifts } = useShifts();

  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["users-list-filters"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: number; name: string }[] }>("/users/list");
      return res.data?.data ?? [];
    },
  });
  const users = usersData ?? [];

  const loadingFilters = loadingClients || loadingProducts || loadingShifts || loadingUsers;

  const onFilterSubmit = (data: ReportFilterValues) => {
    const newParams = new URLSearchParams();
    if (data.startDate) newParams.set("startDate", data.startDate);
    if (data.endDate) newParams.set("endDate", data.endDate);
    if (data.clientId) newParams.set("clientId", data.clientId);
    if (data.userId) newParams.set("userId", data.userId);
    if (posMode === "shift" && data.shiftId) newParams.set("shiftId", data.shiftId);
    if (data.productId) newParams.set("productId", data.productId);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    const today = format(new Date(), "yyyy-MM-dd");
    setSearchParams({ page: "1", startDate: today, endDate: today });
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const handleViewSale = useCallback((saleId: number) => {
    setSelectedSaleId(saleId);
    setSaleDialogOpen(true);
  }, []);

  const handleDownloadPdf = () => {
    const params = new URLSearchParams();
    if (currentFilters.startDate) params.append("start_date", currentFilters.startDate);
    if (currentFilters.endDate) params.append("end_date", currentFilters.endDate);
    if (currentFilters.clientId) params.append("client_id", String(currentFilters.clientId));
    if (currentFilters.userId) params.append("user_id", String(currentFilters.userId));
    if (currentFilters.shiftId) params.append("shift_id", String(currentFilters.shiftId));
    window.open(`${webUrl}/reports/sales/pdf?${params.toString()}`, "_blank");
    toast.info(t("reports:salesReportPage.openingPdf"));
  };

  return (
    <div className="min-h-screen bg-background" dir={i18n.dir()}>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="p-1.5 rounded-lg border hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <h1 className="text-base font-bold">{t("reports:salesReportPage.title")}</h1>
              </div>
              <button
                onClick={handleDownloadPdf}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors"
              >
                <FileText size={13} />
                PDF
              </button>
            </div>

            <ReportFilters
              initialValues={currentFilters}
              onFilterSubmit={onFilterSubmit}
              onClearFilters={clearFilters}
              clients={clients}
              users={users}
              products={products}
              shifts={shifts}
              loadingFilters={loadingFilters}
              posMode={posMode}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-screen-2xl mx-auto">
        <ReportStats filterValues={currentFilters} />

        <PaymentsTable
          filterValues={currentFilters}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          onViewSale={handleViewSale}
        />
      </div>

      <LedgerSaleEditorDialog
        open={saleDialogOpen}
        onClose={() => { setSaleDialogOpen(false); setSelectedSaleId(null); }}
        saleId={selectedSaleId}
        onSaleUpdated={() => {}}
      />
    </div>
  );
};

export default SalesReportPage;
