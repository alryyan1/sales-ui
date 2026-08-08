// src/components/pos/CustomerPicker.tsx
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, User, UserCheck, UserX } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

import clientService, { Client } from "@/services/clientService";
import ClientFormModal from "@/components/clients/ClientFormModal";

interface CustomerPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  onSelect: (client: Client | null) => void;
  disabled?: boolean;
}

export function CustomerPicker({
  open,
  onOpenChange,
  client,
  onSelect,
  disabled,
}: CustomerPickerProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const resultsQuery = useQuery({
    queryKey: ["pos-clients-search", debouncedSearch],
    queryFn: () => clientService.autocompleteClients(debouncedSearch, 20),
    enabled: debouncedSearch.length > 0,
  });

  const results = debouncedSearch ? resultsQuery.data ?? [] : [];

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-10 min-w-0 max-w-56 justify-start gap-2 px-3"
          >
            {client ? (
              <UserCheck className="size-4 shrink-0 text-primary" />
            ) : (
              <User className="size-4 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate text-sm">{client ? client.name : "عميل نقدي"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="ابحث بالاسم أو الهاتف..."
            />
            <CommandList>
              <CommandGroup>
                <CommandItem
                  value="walk-in"
                  onSelect={() => {
                    onSelect(null);
                    onOpenChange(false);
                  }}
                >
                  <UserX className="size-4 text-muted-foreground" />
                  عميل نقدي (بدون تسجيل)
                </CommandItem>
                <CommandItem
                  value="create-new"
                  onSelect={() => {
                    onOpenChange(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-4 text-primary" />
                  إنشاء عميل جديد...
                </CommandItem>
              </CommandGroup>

              {debouncedSearch && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="نتائج البحث">
                    {resultsQuery.isLoading ? (
                      <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        جاري البحث...
                      </div>
                    ) : results.length === 0 ? (
                      <CommandEmpty>لا يوجد عملاء مطابقون</CommandEmpty>
                    ) : (
                      results.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={String(c.id)}
                          onSelect={() => {
                            onSelect(c);
                            onOpenChange(false);
                          }}
                        >
                          <User className="size-4 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{c.name}</p>
                            {c.phone && (
                              <p className="text-xs text-muted-foreground" dir="ltr">
                                {c.phone}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    )}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <ClientFormModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        clientToEdit={null}
        onSaveSuccess={(newClient) => {
          setCreateOpen(false);
          if (newClient) onSelect(newClient);
        }}
      />
    </>
  );
}
