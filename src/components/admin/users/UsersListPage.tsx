// src/components/admin/users/UsersListPage.tsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Skeleton from "@mui/material/Skeleton";
import Pagination from "@mui/material/Pagination";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import { useTranslation } from "react-i18next";

import {
  Search,
  Clear,
  Add,
  Edit,
  PeopleOutline,
  WarehouseOutlined,
  ManageAccountsOutlined,
  ErrorOutline,
} from "@mui/icons-material";

// Services and Types
import { useAuthorization } from "@/hooks/useAuthorization";
import { User } from "@/services/authService";
import userService from "@/services/userService";

// Custom Components
import UserFormModal from "./UserFormModal";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 45%, 48%)`;
}

const UsersListPage: React.FC = () => {
  const { t, i18n } = useTranslation(["users"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthorization();

  const COLS = [
    t("users:listPage.columnUser"),
    t("users:listPage.columnLogin"),
    t("users:listPage.columnRoles"),
    t("users:listPage.columnWarehouse"),
    t("users:listPage.columnAction"),
  ];

  const initialSearch = searchParams.get("search") || "";
  const initialPage = Number(searchParams.get("page") || "1");

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm !== initialSearch) {
        setPage(1);
        setSearchParams((prev) => {
          prev.set("page", "1");
          if (searchTerm) prev.set("search", searchTerm);
          else prev.delete("search");
          return prev;
        });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm, setSearchParams, initialSearch]);

  const handlePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
    setSearchParams((prev) => {
      prev.set("page", newPage.toString());
      return prev;
    });
  };

  const {
    data: usersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", page, debouncedSearch],
    queryFn: () => userService.getUsers(page, debouncedSearch),
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
    toast.success(editingUser ? t("users:listPage.updatedSuccessfully") : t("users:listPage.createdSuccessfully"));
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: "auto" }} dir={i18n.dir()}>
      {/* ── Page Header ── */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          mb: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap:3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "white",

            }}
          >
            <ManageAccountsOutlined fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {t("users:listPage.manageTitle")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("users:listPage.manageSubtitle")}
            </Typography>
          </Box>
        </Box>
    <TextField
          size="small"
          placeholder={t("users:listPage.searchByNameOrLogin")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, maxWidth: { xs: "100%", sm: 300 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm("")}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
   
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={() => openModal()}
        >
          {t("users:listPage.newUser")}
        </Button>
      </Box>

      {/* ── Toolbar: Search + count ── */}

    

      {/* ── Error ── */}
      {isError && (
        <Alert
          severity="error"
          icon={<ErrorOutline />}
          sx={{ mb: 1.5, borderRadius: 2 }}
        >
          {error instanceof Error
            ? error.message
            : t("users:listPage.unexpectedError")}
        </Alert>
      )}

      {/* ── Table ── */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.50" }}>
                {COLS.map((col) => (
                  <TableCell
                    key={col}
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      py: 1,
                      color: "text.secondary",
                      whiteSpace: "nowrap",
                      borderBottom: "2px solid",
                      borderColor: "divider",
                    }}
                  >
                    {col}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {/* Loading skeleton */}
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {COLS.map((col, colIndex) => (
                      <TableCell key={col} align="center" sx={{ py: 1 }}>
                        <Skeleton
                          variant="rounded"
                          height={24}
                          sx={{ mx: "auto", maxWidth: colIndex === 2 ? 120 : 80 }}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {/* Empty state */}
              {!isLoading &&
                !isError &&
                usersResponse?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <PeopleOutline
                        sx={{ fontSize: 48, color: "text.disabled", mb: 1 }}
                      />
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontWeight={600}
                      >
                        {t("users:listPage.noMatchingResults")}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        {t("users:listPage.tryAdjustingSearch")}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

              {/* Data rows */}
              {!isLoading &&
                !isError &&
                usersResponse?.data.map((user) => {
                  const isSelf = user.id === currentUser?.id;
                  return (
                    <TableRow
                      key={user.id}
                      hover
                      sx={{
                        "&:last-child td": { border: 0 },
                        bgcolor: isSelf ? "primary.50" : "inherit",
                      }}
                    >
                      {/* Name + avatar */}
                      <TableCell align="center" sx={{ py: 0.75 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 30,
                              height: 30,
                              fontSize: "0.7rem",
                              bgcolor: stringToColor(user.name),
                            }}
                          >
                            {getInitials(user.name)}
                          </Avatar>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              lineHeight={1.2}
                            >
                              {user.name}
                            </Typography>
                            {isSelf && (
                              <Chip
                                label={t("users:listPage.you")}
                                size="small"
                                color="primary"
                                sx={{ height: 16, fontSize: "0.65rem", mt: 0.25 }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Username */}
                      <TableCell align="center" sx={{ py: 0.75 }}>
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          color="text.secondary"
                        >
                          @{user.username}
                        </Typography>
                      </TableCell>

                      {/* Roles */}
                      <TableCell align="center" sx={{ py: 0.75 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            justifyContent: "center",
                          }}
                        >
                          {(user.roles ?? []).map((roleName) => {
                            const isAdmin =
                              roleName === "admin" || roleName === "ادمن";
                            return (
                              <Chip
                                key={roleName}
                                label={roleName}
                                size="small"
                                color={isAdmin ? "primary" : "default"}
                                variant={isAdmin ? "filled" : "outlined"}
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                            );
                          })}
                        </Box>
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell align="center" sx={{ py: 0.75 }}>
                        {user.warehouse ? (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                              justifyContent: "center",
                            }}
                          >
                            <WarehouseOutlined
                              sx={{ fontSize: 14, color: "text.disabled" }}
                            />
                            <Typography variant="body2">
                              {user.warehouse.name}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="center" sx={{ py: 0.75 }}>
                        <Tooltip title={t("users:listPage.editData")} placement="right">
                          <IconButton
                            size="small"
                            onClick={() => openModal(user)}
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* ── Pagination (inside the paper, bottom strip) ── */}
        {!isLoading &&
          !isError &&
          usersResponse &&
          usersResponse.last_page > 1 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                px: 2,
                py: 1,
                borderTop: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {t("users:listPage.pageSummary", {
                  page,
                  lastPage: usersResponse.last_page,
                  total: usersResponse.total,
                })}
              </Typography>
              <Pagination
                count={usersResponse.last_page}
                page={page}
                onChange={handlePageChange}
                size="small"
                shape="rounded"
                color="primary"
              />
            </Box>
          )}
      </Paper>

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
