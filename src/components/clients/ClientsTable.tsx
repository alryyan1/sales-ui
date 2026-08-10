// src/components/clients/ClientsTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Users,
  MoreHorizontal,
  Phone,
  Mail,
  FileText,
  Pencil,
  Trash2,
  Truck,
} from "lucide-react";

import { Client } from "../../services/clientService";

interface ClientsTableProps {
  clients: Client[];
  isLoading?: boolean;
  onClientClick?: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onDelete?: (id: number) => void;
  onViewLedger?: (id: number) => void;
  // Selection
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  onToggleAll?: (clients: Client[]) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  isLoading = false,
  onClientClick,
  onEdit,
  onDelete,
  onViewLedger,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onToggleAll,
}) => {
  const { t } = useTranslation("clients");
  const { t: tCommon } = useTranslation("common");
  const fmt = (n: number) =>
    n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const allSelected = clients.length > 0 && clients.every((c) => selectedIds.has(c.id));
  const someSelected = clients.some((c) => selectedIds.has(c.id)) && !allSelected;

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
          {selectionMode && (
            <TableHead className="w-10 px-3 h-9">
              <Checkbox
                checked={allSelected}
                data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                onCheckedChange={() => onToggleAll?.(clients)}
                aria-label={tCommon("selectAll")}
              />
            </TableHead>
          )}
          <TableHead className="text-start text-xs font-semibold text-slate-600 h-9 px-4">{t("client")}</TableHead>
          <TableHead className="text-start text-xs font-semibold text-slate-600 h-9 px-4">{t("contactInfo")}</TableHead>
          <TableHead className="text-start text-xs font-semibold text-red-500 h-9 px-4">{t("debitLabel")}</TableHead>
          <TableHead className="text-start text-xs font-semibold text-emerald-600 h-9 px-4">{t("paymentsLabel")}</TableHead>
          <TableHead className="text-start text-xs font-semibold text-blue-600 h-9 px-4">{t("balance")}</TableHead>
          {!selectionMode && (
            <TableHead className="text-center text-xs font-semibold text-slate-600 h-9 px-4 w-12">⋯</TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <TableRow key={i} className="border-b border-slate-100">
              {selectionMode && <TableCell className="px-3 py-2.5"><Skeleton className="h-4 w-4 rounded" /></TableCell>}
              <TableCell className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-md flex-shrink-0" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </TableCell>
              <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-32" /></TableCell>
              <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-20" /></TableCell>
              <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-20" /></TableCell>
              <TableCell className="px-4 py-2.5"><Skeleton className="h-3 w-20" /></TableCell>
              {!selectionMode && <TableCell className="px-4 py-2.5"><Skeleton className="h-6 w-6 rounded mx-auto" /></TableCell>}
            </TableRow>
          ))
        ) : clients.length === 0 ? (
          <TableRow>
            <TableCell colSpan={selectionMode ? 6 : 7} className="h-36 text-center">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Users className="h-7 w-7" />
                <p className="text-sm font-medium text-slate-500">{t("noClientsShort")}</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          clients.map((client) => {
            const bal = client.balance ?? 0;
            const isSelected = selectedIds.has(client.id);
            return (
              <TableRow
                key={client.id}
                className={`cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${
                  isSelected
                    ? "bg-blue-50/60 hover:bg-blue-50/80"
                    : client.is_supplier
                    ? "bg-amber-50/40 hover:bg-amber-50/70"
                    : "hover:bg-blue-50/30"
                }`}
                onClick={() => {
                  if (selectionMode) {
                    onToggleSelect?.(client.id);
                  } else {
                    onClientClick?.(client);
                  }
                }}
              >
                {/* Checkbox column */}
                {selectionMode && (
                  <TableCell
                    className="px-3 py-2.5 text-center w-10"
                    onClick={(e) => { e.stopPropagation(); onToggleSelect?.(client.id); }}
                  >
                    <Checkbox checked={isSelected} aria-label={t("selectClientAria", { name: client.name })} />
                  </TableCell>
                )}

                {/* Name */}
                <TableCell className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${client.is_supplier ? "bg-amber-100" : "bg-slate-100"}`}>
                      {client.is_supplier
                        ? <Truck className="h-3.5 w-3.5 text-amber-600" />
                        : <Users className="h-3.5 w-3.5 text-slate-500" />
                      }
                    </div>
                    <p className="text-sm font-medium leading-tight">{client.name}</p>
                  </div>
                </TableCell>

                {/* Contact */}
                <TableCell className="px-4 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    {client.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <Phone className="h-3 w-3 text-emerald-500" />
                        <span dir="ltr">{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <Mail className="h-3 w-3 text-blue-400" />
                        <span className="truncate max-w-[160px]">{client.email}</span>
                      </div>
                    )}
                    {!client.phone && !client.email && (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </TableCell>

                {/* Debit */}
                <TableCell className="px-4 py-2.5">
                  <span className="text-xs font-medium text-red-600 tabular-nums">
                    {fmt(client.total_debit ?? 0)}
                  </span>
                </TableCell>

                {/* Credit */}
                <TableCell className="px-4 py-2.5">
                  <span className="text-xs font-medium text-emerald-600 tabular-nums">
                    {fmt(client.total_credit ?? 0)}
                  </span>
                </TableCell>

                {/* Balance */}
                <TableCell className="px-4 py-2.5">
                  <span className={`text-xs font-semibold tabular-nums ${bal > 0 ? "text-red-600" : bal < 0 ? "text-emerald-600" : "text-slate-400"}`}>
                    {fmt(bal)}
                  </span>
                </TableCell>

                {/* Actions — hidden in selection mode */}
                {!selectionMode && (
                  <TableCell className="px-4 py-2.5">
                    <div className="flex justify-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-sm">
                          {onViewLedger && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); onViewLedger(client.id); }}
                              className="gap-2"
                            >
                              <FileText className="h-3.5 w-3.5 text-blue-500" />
                              {t("ledger")}
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                              className="gap-2"
                            >
                              <Pencil className="h-3.5 w-3.5 text-amber-500" />
                              {tCommon("edit")}
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); onDelete(client.id); }}
                                className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {tCommon("delete")}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default ClientsTable;
