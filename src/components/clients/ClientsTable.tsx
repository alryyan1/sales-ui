// src/components/clients/ClientsTable.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

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

import {
  Users,
  MoreHorizontal,
  Phone,
  Mail,
  FileText,
  Pencil,
  Trash2,
} from "lucide-react";

import { Client } from "../../services/clientService";

interface ClientsTableProps {
  clients: Client[];
  isLoading?: boolean;
  onClientClick?: (client: Client) => void;
  onEdit?: (client: Client) => void;
  onDelete?: (id: number) => void;
  onViewLedger?: (id: number) => void;
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  isLoading = false,
  onClientClick,
  onEdit,
  onDelete,
  onViewLedger,
}) => {
  const fmt = (n: number) =>
    n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
          <TableHead className="text-right text-xs font-semibold text-slate-600 h-9 px-4">العميل</TableHead>
          <TableHead className="text-right text-xs font-semibold text-slate-600 h-9 px-4">معلومات الاتصال</TableHead>
          <TableHead className="text-right text-xs font-semibold text-red-500 h-9 px-4">المديونية</TableHead>
          <TableHead className="text-right text-xs font-semibold text-emerald-600 h-9 px-4">المدفوعات</TableHead>
          <TableHead className="text-right text-xs font-semibold text-blue-600 h-9 px-4">الرصيد</TableHead>
          <TableHead className="text-center text-xs font-semibold text-slate-600 h-9 px-4 w-12">⋯</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => (
            <TableRow key={i} className="border-b border-slate-100">
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
              <TableCell className="px-4 py-2.5"><Skeleton className="h-6 w-6 rounded mx-auto" /></TableCell>
            </TableRow>
          ))
        ) : clients.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="h-36 text-center">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Users className="h-7 w-7" />
                <p className="text-sm font-medium text-slate-500">لا يوجد عملاء</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          clients.map((client) => {
            const bal = client.balance ?? 0;
            return (
              <TableRow
                key={client.id}
                className="hover:bg-blue-50/30 cursor-pointer transition-colors border-b border-slate-100 last:border-0"
                onClick={() => onClientClick?.(client)}
              >
                {/* Name */}
                <TableCell className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
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

                {/* Actions */}
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
                            كشف الحساب
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); onEdit(client); }}
                            className="gap-2"
                          >
                            <Pencil className="h-3.5 w-3.5 text-amber-500" />
                            تعديل
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
                              حذف
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
};

export default ClientsTable;
