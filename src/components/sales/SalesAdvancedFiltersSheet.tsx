// src/components/sales/SalesAdvancedFiltersSheet.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, User, UserX } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import clientService, { Client } from "@/services/clientService";
import apiClient from "@/lib/axios";
import { useShifts } from "@/hooks/useShifts";
import { useLanguage } from "@/context/LanguageContext";

export interface SalesAdvancedFilterValues {
  clientId: string;
  clientName: string;
  userId: string;
  shiftId: string;
}

interface SalesAdvancedFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  posMode: "shift" | "days";
  values: SalesAdvancedFilterValues;
  onApply: (values: SalesAdvancedFilterValues) => void;
}

export function SalesAdvancedFiltersSheet({
  open,
  onOpenChange,
  posMode,
  values,
  onApply,
}: SalesAdvancedFiltersSheetProps) {
  const { direction } = useLanguage();
  const { t } = useTranslation("sales");
  const [draft, setDraft] = useState<SalesAdvancedFilterValues>(values);
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(values);
      setClientSearch("");
    }
  }, [open, values]);

  const clientResultsQuery = useQuery({
    queryKey: ["sales-filter-clients", clientSearch],
    queryFn: () => clientService.autocompleteClients(clientSearch, 20),
    enabled: clientSearch.trim().length > 0,
  });

  const usersQuery = useQuery({
    queryKey: ["users-list-filters"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: number; name: string }[] }>("/users/list");
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const shiftsQuery = useShifts();

  const selectClient = (client: Client | null) => {
    setDraft((prev) => ({
      ...prev,
      clientId: client ? String(client.id) : "",
      clientName: client?.name ?? "",
    }));
  };

  const handleApply = () => {
    onApply(draft);
    onOpenChange(false);
  };

  const handleReset = () => {
    const cleared: SalesAdvancedFilterValues = { clientId: "", clientName: "", userId: "", shiftId: "" };
    setDraft(cleared);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={direction === "rtl" ? "left" : "right"}
        dir={direction}
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="text-base">{t("advancedFilters")}</SheetTitle>
          <SheetDescription>{t("advancedFiltersDescription")}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <Label>{t("client")}</Label>
            {draft.clientId ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{draft.clientName || t("clientHash", { id: draft.clientId })}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => selectClient(null)}>
                  <UserX className="size-3.5" />
                  {t("remove")}
                </Button>
              </div>
            ) : (
              <Command shouldFilter={false} className="rounded-md border">
                <CommandInput
                  value={clientSearch}
                  onValueChange={setClientSearch}
                  placeholder={t("clientSearchPlaceholder")}
                />
                <CommandList className="max-h-48">
                  {clientSearch.trim() === "" ? (
                    <p className="p-3 text-center text-xs text-muted-foreground">{t("typeToSearchClient")}</p>
                  ) : clientResultsQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      {t("searching")}
                    </div>
                  ) : (
                    <CommandGroup>
                      {(clientResultsQuery.data ?? []).length === 0 ? (
                        <CommandEmpty>{t("noMatchingClients")}</CommandEmpty>
                      ) : (
                        clientResultsQuery.data?.map((c) => (
                          <CommandItem key={c.id} value={String(c.id)} onSelect={() => selectClient(c)}>
                            <User className="size-4 text-muted-foreground" />
                            {c.name}
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("cashierColumn")}</Label>
            <Select
              value={draft.userId || "all"}
              onValueChange={(v) => setDraft((p) => ({ ...p, userId: v === "all" ? "" : v }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("allCashiers")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCashiers")}</SelectItem>
                {(usersQuery.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {posMode === "shift" && (
            <div className="space-y-1.5">
              <Label>{t("shiftLabel")}</Label>
              <Select
                value={draft.shiftId || "all"}
                onValueChange={(v) => setDraft((p) => ({ ...p, shiftId: v === "all" ? "" : v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("allShifts")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allShifts")}</SelectItem>
                  {(shiftsQuery.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name ? s.name : t("shiftHashFilter", { id: s.id })}
                      {s.shift_date ? ` (${s.shift_date})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-3.5">
          <Button type="button" variant="outline" onClick={handleReset}>
            {t("resetButton")}
          </Button>
          <Button type="button" onClick={handleApply}>
            {t("applyFilters")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
