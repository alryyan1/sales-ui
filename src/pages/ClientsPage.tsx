// src/pages/ClientsPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CircularProgress } from "@mui/material";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

import clientService, {
  Client,
  PaginatedResponse,
} from "../services/clientService";

import ClientsTable from "../components/clients/ClientsTable";
import ClientFormModal from "../components/clients/ClientFormModal";
import ConfirmationDialog from "../components/common/ConfirmationDialog";
import ClientProceduresDialog from "../components/clients/ClientProceduresDialog";
import WhatsAppBulkDialog from "../components/clients/WhatsAppBulkDialog";
import {
  PlusIcon,
  CloudUpload,
  Search,
  Users,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  CheckSquare,
  X,
} from "lucide-react";
import { MessageSquare } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import { useLanguage } from "@/context/LanguageContext";
import { uploadClientsToFirestore } from "../services/firebaseStore";
import apiClient from "../lib/axios";
import { toast } from "sonner";

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const { direction } = useLanguage();
  const { t } = useTranslation("clients");
  const { t: tCommon } = useTranslation("common");
  const companyName = getSetting("company_name", t("companyNameDefault")) as string;
  const firebaseCollectionName = getSetting("firebase_collection_name", "none") as string;

  const [clientsResponse, setClientsResponse] = useState<PaginatedResponse<Client> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [clientToDeleteId, setClientToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedClientForProcedures, setSelectedClientForProcedures] = useState<Client | null>(null);
  const [isProceduresOpen, setIsProceduresOpen] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkWaOpen, setIsBulkWaOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchClients = useCallback(async (page: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await clientService.getClients(page, search);
      setClientsResponse(data);
    } catch (err) {
      setError(clientService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients(currentPage, debouncedSearch);
  }, [fetchClients, currentPage, debouncedSearch]);

  const openModal = (client: Client | null = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSaveSuccess = () => {
    setIsModalOpen(false);
    fetchClients(editingClient ? currentPage : 1, debouncedSearch);
    if (!editingClient) setCurrentPage(1);
  };

  const openConfirmDialog = (id: number) => {
    setClientToDeleteId(id);
    setIsConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setTimeout(() => setClientToDeleteId(null), 300);
  };

  const handleDeleteConfirm = async () => {
    if (!clientToDeleteId) return;
    setIsDeleting(true);
    try {
      await clientService.deleteClient(clientToDeleteId);
      closeConfirmDialog();
      if (clientsResponse && clientsResponse.data.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchClients(currentPage, debouncedSearch);
      }
    } catch {
      closeConfirmDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncToFirebase = async () => {
    setIsSyncing(true);
    try {
      const allClients: Client[] = [];
      let page = 1;
      let lastPage = 1;
      do {
        const res = await apiClient.get<{ data: Client[]; last_page: number }>(`/clients?page=${page}&per_page=500`);
        allClients.push(...res.data.data);
        lastPage = res.data.last_page;
        page++;
      } while (page <= lastPage);
      await uploadClientsToFirestore(allClients, firebaseCollectionName);
      toast.success(t("firebaseUploadSuccess", { count: allClients.length }));
    } catch {
      toast.error(t("firebaseUploadFailed"));
    } finally {
      setIsSyncing(false);
    }
  };

  // ── Selection handlers ───────────────────────────────────────────────────
  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleAll = (visibleClients: Client[]) => {
    const allVisible = visibleClients.every((c) => selectedIds.has(c.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisible) {
        visibleClients.forEach((c) => next.delete(c.id));
      } else {
        visibleClients.forEach((c) => next.add(c.id));
      }
      return next;
    });
  };

  const clients = clientsResponse?.data ?? [];
  const totalPages = clientsResponse?.last_page ?? 1;
  const total = clientsResponse?.total ?? 0;

  // Clients that are selected AND currently visible (for the dialog)
  const selectedClients = clients.filter((c) => selectedIds.has(c.id));

  return (
    <div className="p-4 space-y-3" dir={direction}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-slate-500" />
          <h1 className="text-lg font-semibold text-slate-800">{t("pageHeading")}</h1>
          {!isLoading && (
            <span className="text-xs text-slate-400 font-normal">({total})</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncToFirebase}
            disabled={isSyncing}
            className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
          >
            {isSyncing
              ? <CircularProgress size={12} color="inherit" />
              : <CloudUpload className="h-3.5 w-3.5" />}
            Firebase
          </Button>

          {/* Toggle selection mode */}
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className={`h-8 gap-1.5 text-xs ${selectionMode ? "" : "text-blue-600 border-blue-200 hover:bg-blue-50"}`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            {selectionMode ? t("exitSelectionMode") : t("selectMultiple")}
          </Button>

          <Button
            size="sm"
            onClick={() => openModal()}
            className="h-8 gap-1.5 text-xs"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t("addClientShort")}
          </Button>
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-8 ps-8 text-sm"
        />
      </div>

      {/* ── Selection toolbar (visible when selectionMode active) ── */}
      {selectionMode && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-xs font-semibold text-blue-700">
            {t("selectedCount", { count: selectedIds.size })}
          </span>

          <div className="flex items-center gap-1.5 ms-auto">
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs bg-[#25D366] hover:bg-[#1ebe59] text-white border-0"
                onClick={() => setIsBulkWaOpen(true)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {t("sendWhatsappCount", { count: selectedIds.size })}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500"
              onClick={exitSelectionMode}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────── */}
      {!isLoading && error && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs me-auto" onClick={() => fetchClients(currentPage, debouncedSearch)}>
            <RefreshCw className="h-3 w-3 me-1" /> {tCommon("retry")}
          </Button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <ClientsTable
          clients={clients}
          isLoading={isLoading}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleAll={handleToggleAll}
          onClientClick={(client) => {
            setSelectedClientForProcedures(client);
            setIsProceduresOpen(true);
          }}
          onEdit={openModal}
          onDelete={openConfirmDialog}
          onViewLedger={(id) => navigate(`/clients/${id}/ledger`)}
        />

        {/* ── Pagination ───────────────────────────────────── */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              {t("pageOfTotal", { page: currentPage, total: totalPages })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                {direction === "rtl" ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + Math.max(1, Math.min(currentPage - 2, totalPages - 4));
                return (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="icon"
                    className="h-7 w-7 text-xs"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                {direction === "rtl" ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ───────────────────────────────────────────── */}
      <ClientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clientToEdit={editingClient}
        onSaveSuccess={handleSaveSuccess}
      />

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleDeleteConfirm}
        title={t("confirmDeleteTitle")}
        message={t("deleteClientConfirmFull")}
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        isLoading={isDeleting}
      />

      <ClientProceduresDialog
        open={isProceduresOpen}
        onClose={() => setIsProceduresOpen(false)}
        client={selectedClientForProcedures}
        onEdit={openModal}
        onDelete={openConfirmDialog}
        onViewLedger={(id) => navigate(`/clients/${id}/ledger`)}
        onNewSale={(_) => (window.location.hash = `#/sales/pos-blank`)}
        companyName={companyName}
      />

      <WhatsAppBulkDialog
        open={isBulkWaOpen}
        onClose={() => {
          setIsBulkWaOpen(false);
          exitSelectionMode();
        }}
        clients={selectedClients}
      />
    </div>
  );
};

export default ClientsPage;
