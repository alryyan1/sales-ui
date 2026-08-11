// src/pages/admin/RolesListPage.tsx
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Plus,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import roleService, { RoleWithPermissions } from "@/services/roleService";
import { RolePermissionsPanel } from "@/components/admin/users/roles/RolePermissionsPanel";
import { isSystemRole } from "@/components/admin/users/roles/roleUtils";

function RoleListItem({
  role,
  selected,
  onSelect,
}: {
  role: RoleWithPermissions;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation("roles");
  const protectedRole = isSystemRole(role.name);
  const permissionCount = role.permissions_count ?? 0;
  const usersCount = role.users_count ?? 0;
  const noPermissions = permissionCount === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-start transition-colors",
        selected ? "bg-accent" : "hover:bg-accent/50"
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          protectedRole
            ? "bg-primary/10 text-primary"
            : noPermissions
            ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
            : "bg-muted text-muted-foreground"
        )}
      >
        {protectedRole ? (
          <ShieldCheck className="size-4" />
        ) : noPermissions ? (
          <ShieldAlert className="size-4" />
        ) : (
          <Shield className="size-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{role.name}</span>
          {protectedRole && <Lock className="size-3 shrink-0 text-muted-foreground" />}
        </div>
        <p
          className={cn(
            "truncate text-xs",
            noPermissions ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}
        >
          {noPermissions
            ? t("noPermissionsShort")
            : t("permissionsCountShort", { count: permissionCount })}
          {usersCount > 0 && t("usersCountShort", { count: usersCount })}
        </p>
      </div>

      <ChevronLeft
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      />
    </button>
  );
}

function EmptyDetailState({ onCreate }: { onCreate: () => void }) {
  const { t } = useTranslation("roles");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <ShieldQuestion className="size-8 text-muted-foreground" />
      <div>
        <p className="text-sm font-medium text-foreground">{t("selectRolePrompt")}</p>
        <p className="mt-1 max-w-xs text-xs text-muted-foreground">
          {t("selectRoleHint")}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={onCreate} className="gap-1.5">
        <Plus className="size-4" />
        {t("newRole")}
      </Button>
    </div>
  );
}

const RolesListPage: React.FC = () => {
  const { t } = useTranslation("roles");
  const queryClient = useQueryClient();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const [selectedRole, setSelectedRole] = useState<RoleWithPermissions | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPanelSubmitting, setIsPanelSubmitting] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);

  const panelMode: "create" | "edit" | null = isCreating
    ? "create"
    : selectedRole
    ? "edit"
    : null;

  const rolesQuery = useQuery({
    queryKey: ["admin-roles", page],
    queryFn: () => roleService.getRoles(page),
    placeholderData: (prev) => prev,
  });

  const permissionsQuery = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => roleService.getPermissions(),
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({ mutationFn: roleService.createRole });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { permissions: string[] } }) =>
      roleService.updateRole(id, data),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => roleService.deleteRole(id),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      if (roleToDelete && selectedRole?.id === roleToDelete.id) {
        setSelectedRole(null);
      }
      setRoleToDelete(null);
      const isLastRowOnPage = rolesQuery.data?.data.length === 1 && page > 1;
      if (isLastRowOnPage) {
        setPage((p) => p - 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      }
    },
    onError: (err) => {
      toast.error(t("deleteErrorTitle"), { description: roleService.getErrorMessage(err) });
    },
  });

  const roles = rolesQuery.data?.data ?? [];
  const filteredRoles = useMemo(() => {
    const term = search.trim();
    if (!term) return roles;
    return roles.filter((role) => role.name.includes(term));
  }, [roles, search]);

  const openCreatePanel = () => {
    setSelectedRole(null);
    setIsCreating(true);
  };
  const openRolePanel = (role: RoleWithPermissions) => {
    setIsCreating(false);
    setSelectedRole(role);
  };
  const closePanel = () => {
    setIsCreating(false);
    setSelectedRole(null);
  };

  const handleSaved = (kind: "create" | "update", role: RoleWithPermissions) => {
    queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    toast.success(kind === "create" ? t("createSuccess") : t("updateSuccess"));
    setIsCreating(false);
    setSelectedRole(role);
  };

  const confirmDelete = () => {
    if (roleToDelete) deleteMutation.mutate(roleToDelete.id);
  };

  const isInitialLoading = rolesQuery.isLoading;
  const isEmpty = !isInitialLoading && !rolesQuery.isError && roles.length === 0;
  const isSearchEmpty =
    !isInitialLoading && !isEmpty && search.trim() !== "" && filteredRoles.length === 0;

  const panelProps = panelMode
    ? {
        mode: panelMode,
        role: selectedRole,
        availablePermissions: permissionsQuery.data ?? [],
        loadingPermissions: permissionsQuery.isLoading,
        permissionsError: permissionsQuery.isError,
        onCreate: (data: Parameters<typeof createMutation.mutateAsync>[0]) =>
          createMutation.mutateAsync(data),
        onUpdate: (id: number, data: { permissions: string[] }) =>
          updateMutation.mutateAsync({ id, data }),
        onSaved: handleSaved,
        onCancel: closePanel,
        onRequestDelete: setRoleToDelete,
        onSubmittingChange: setIsPanelSubmitting,
      }
    : null;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        {/* Page header */}
        <div className="mb-6 border-b pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {t("pageTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pageDescription")}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:h-[calc(100vh-230px)] lg:min-h-[560px] lg:grid-cols-[340px_1fr]">
          {/* List pane */}
          <div className="flex min-h-0 flex-col rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{t("rolesListTitle")}</p>
                <p className="text-xs text-muted-foreground">
                  {rolesQuery.isError
                    ? "—"
                    : t("totalRoles", { count: rolesQuery.data?.total ?? roles.length })}
                </p>
              </div>
              <Button size="sm" onClick={openCreatePanel} className="gap-1.5">
                <Plus className="size-4" />
                {t("newRole")}
              </Button>
            </div>

            <div className="border-b p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchByName")}
                  className="pr-9"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={t("clearSearch")}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {rolesQuery.isError && (
                <Alert variant="destructive" className="m-1">
                  <AlertCircle className="size-4" />
                  <AlertTitle>{t("loadFailed")}</AlertTitle>
                  <AlertDescription className="flex flex-col items-start gap-2">
                    <span>{roleService.getErrorMessage(rolesQuery.error)}</span>
                    <Button size="sm" variant="outline" onClick={() => rolesQuery.refetch()}>
                      {t("retryButton")}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {isInitialLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
                    <Skeleton className="size-9 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}

              {isEmpty && (
                <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
                  <ShieldQuestion className="size-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("noRolesYet")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("noRolesYetHint")}
                    </p>
                  </div>
                  <Button size="sm" onClick={openCreatePanel} className="gap-1.5">
                    <Plus className="size-4" />
                    {t("createFirstRole")}
                  </Button>
                </div>
              )}

              {isSearchEmpty && (
                <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
                  <p className="text-sm text-muted-foreground">
                    {t("noSearchResults", { search })}
                  </p>
                  <Button variant="link" size="sm" onClick={() => setSearch("")}>
                    {t("clearSearch")}
                  </Button>
                </div>
              )}

              {!isInitialLoading &&
                !rolesQuery.isError &&
                filteredRoles.map((role) => (
                  <RoleListItem
                    key={role.id}
                    role={role}
                    selected={selectedRole?.id === role.id}
                    onSelect={() => openRolePanel(role)}
                  />
                ))}
            </div>

            {rolesQuery.data && rolesQuery.data.last_page > 1 && (
              <div className="flex items-center justify-between gap-2 border-t p-2.5">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1 || rolesQuery.isFetching}
                  onClick={() => setPage((p) => p - 1)}
                  className="gap-1"
                >
                  <ChevronRight className="size-4" />
                  {t("previous")}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {rolesQuery.data.current_page} / {rolesQuery.data.last_page}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= rolesQuery.data.last_page || rolesQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="gap-1"
                >
                  {t("next")}
                  <ChevronLeft className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Detail pane — desktop only (mobile uses the Sheet below) */}
          {isDesktop && (
            <div className="flex min-h-0 flex-col rounded-xl border bg-card">
              {panelProps ? (
                <RolePermissionsPanel {...panelProps} />
              ) : (
                <EmptyDetailState onCreate={openCreatePanel} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel — mobile / tablet */}
      {!isDesktop && (
        <Sheet
          open={panelMode !== null}
          onOpenChange={(open) => {
            if (!open && !isPanelSubmitting) closePanel();
          }}
        >
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
            <SheetHeader className="sr-only">
              <SheetTitle>
                {panelMode === "create" ? t("newRole") : selectedRole?.name ?? t("roleFallback")}
              </SheetTitle>
            </SheetHeader>
            {panelProps && <RolePermissionsPanel {...panelProps} />}
          </SheetContent>
        </Sheet>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!roleToDelete}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setRoleToDelete(null);
        }}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("deleteRoleTitle", { name: roleToDelete?.name })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleToDelete?.users_count
                ? t("deleteRoleWithUsersWarning", { count: roleToDelete.users_count })
                : t("actionCannotBeUndone")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={deleteMutation.isPending}
              onClick={() => setRoleToDelete(null)}
            >
              {t("cancelButton")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={confirmDelete}
              className="gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              {t("deletePermanently")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RolesListPage;
