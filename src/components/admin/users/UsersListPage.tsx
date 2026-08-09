// src/components/admin/users/UsersListPage.tsx
import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridRenderCellParams,
} from "@mui/x-data-grid";
import { arSD } from "@mui/x-data-grid/locales";

// Services and Types
import { useAuthorization } from "@/hooks/useAuthorization";
import { User } from "@/services/authService";
import userService from "@/services/userService";

// Custom Components
import UserFormModal from "./UserFormModal";

const gridLocaleText = arSD.components.MuiDataGrid.defaultProps.localeText;

const UsersListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthorization();

  const initialSearch = searchParams.get("search") || "";
  const initialRole = searchParams.get("role") || "";
  const initialPage = Number(searchParams.get("page") || "1");
  const initialPageSize = Number(searchParams.get("per_page") || "15");

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: Math.max(initialPage - 1, 0),
    pageSize: initialPageSize,
  });

  // Debounce search, resetting to page 1 on change
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm !== initialSearch) {
        setPaginationModel((p) => ({ ...p, page: 0 }));
      }
    }, 500);
    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Keep the URL in sync so the view is shareable/refreshable
  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) {
        next.set("search", debouncedSearch);
      } else {
        next.delete("search");
      }
      if (roleFilter) {
        next.set("role", roleFilter);
      } else {
        next.delete("role");
      }
      next.set("page", String(paginationModel.page + 1));
      next.set("per_page", String(paginationModel.pageSize));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, roleFilter, paginationModel]);

  const {
    data: usersResponse,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "users",
      paginationModel.page,
      paginationModel.pageSize,
      debouncedSearch,
      roleFilter,
    ],
    queryFn: () =>
      userService.getUsers(
        paginationModel.page + 1,
        debouncedSearch,
        roleFilter,
        paginationModel.pageSize
      ),
    placeholderData: (prev) => prev,
  });

  const { data: availableRoles = [] } = useQuery({
    queryKey: ["roles-list"],
    queryFn: userService.getRoles,
    staleTime: 5 * 60 * 1000,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const openModal = (user: User | null = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveSuccess = () => {
    closeModal();
    refetch();
    toast.success(editingUser ? "تم التحديث بنجاح" : "تم الإنشاء بنجاح");
  };

  const handleRoleFilterChange = (e: SelectChangeEvent) => {
    setRoleFilter(e.target.value);
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns = useMemo<GridColDef<User>[]>(
    () => [
      {
        field: "name",
        headerName: "المستخدم",
        flex: 1.4,
        minWidth: 200,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<User>) => {
          const isSelf = params.row.id === currentUser?.id;
          return (
            <Typography variant="body2" fontWeight={600}>
              {params.row.name}
              {isSelf && (
                <Typography component="span" variant="caption" color="text.secondary">
                  {" "}
                  (أنت)
                </Typography>
              )}
            </Typography>
          );
        },
      },
      {
        field: "username",
        headerName: "اسم الدخول",
        flex: 0.9,
        minWidth: 130,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<User>) => (
          <Typography variant="body2" fontFamily="monospace" color="text.secondary">
            @{params.row.username}
          </Typography>
        ),
      },
      {
        field: "roles",
        headerName: "الأدوار",
        flex: 1.3,
        minWidth: 170,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<User>) => {
          const roleNames = params.row.roles ?? [];
          const hasAdmin = roleNames.includes("admin") || roleNames.includes("ادمن");
          return (
            <Typography variant="body2" fontWeight={hasAdmin ? 700 : 400}>
              {roleNames.length > 0 ? roleNames.join("، ") : "—"}
            </Typography>
          );
        },
      },
      {
        field: "warehouse",
        headerName: "المستودع",
        flex: 1,
        minWidth: 140,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<User>) => (
          <Typography variant="body2" color={params.row.warehouse ? "text.primary" : "text.disabled"}>
            {params.row.warehouse ? params.row.warehouse.name : "—"}
          </Typography>
        ),
      },
      {
        field: "actions",
        headerName: "إجراء",
        width: 100,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<User>) => (
          <Button size="small" onClick={() => openModal(params.row)}>
            تعديل
          </Button>
        ),
      },
    ],
    [currentUser?.id]
  );

  const totalUsers = usersResponse?.total ?? 0;

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }} dir="rtl">
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            إدارة المستخدمين
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {totalUsers} مستخدم — {availableRoles.length} دور متاح
          </Typography>
        </Box>

        <Button variant="contained" size="small" onClick={() => openModal()}>
          مستخدم جديد
        </Button>
      </Box>

      {/* ── Toolbar: search + role filter ── */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
        <TextField
          size="small"
          placeholder="ابحث بالاسم أو اسم الدخول..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 220, maxWidth: 340 }}
          InputProps={{
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <Button size="small" onClick={() => setSearchTerm("")}>
                  مسح
                </Button>
              </InputAdornment>
            ) : undefined,
          }}
        />

        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>تصفية بالدور</InputLabel>
          <Select label="تصفية بالدور" value={roleFilter} onChange={handleRoleFilterChange}>
            <MenuItem value="">
              <Typography variant="body2" color="text.secondary">
                كل الأدوار
              </Typography>
            </MenuItem>
            {availableRoles.map((role) => (
              <MenuItem key={role.id} value={role.name}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* ── Error ── */}
      {isError && (
        <Alert severity="error" icon={false} sx={{ mb: 1.5, borderRadius: 2 }}>
          {error instanceof Error ? error.message : "حدث خطأ غير متوقع أثناء الاتصال بالخادم."}
        </Alert>
      )}

      {/* ── Grid ── */}
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
        <DataGrid
          rows={usersResponse?.data ?? []}
          columns={columns}
          loading={isLoading || isFetching}
          paginationMode="server"
          rowCount={totalUsers}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[15, 25, 50, 100]}
          getRowHeight={() => "auto"}
          disableRowSelectionOnClick
          disableColumnMenu
          localeText={gridLocaleText}
          slots={{
            noRowsOverlay: () => (
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 6,
                  gap: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={600}>
                  لا توجد نتائج مطابقة
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  حاول ضبط مصطلحات البحث أو الفلتر
                </Typography>
              </Box>
            ),
          }}
          sx={{
            border: "none",
            "--DataGrid-overlayHeight": "300px",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "grey.50",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 700,
              fontSize: "0.78rem",
              color: "text.secondary",
            },
            "& .MuiDataGrid-cell": {
              py: 1,
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
          }}
        />
      </Box>

      {/* ── Modal ── */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        userToEdit={editingUser}
        onSaveSuccess={handleSaveSuccess}
        availableRoles={availableRoles}
      />
    </Box>
  );
};

export default UsersListPage;
