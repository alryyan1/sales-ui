// src/components/admin/users/UsersListPage.tsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Pagination,
  Alert,
  AlertTitle,
  Tooltip,
  Stack,
  Avatar,
  Badge,
  Skeleton,
} from "@mui/material";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Users,
  Store,
  X,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

// Services and Types
import { useAuthorization } from "@/hooks/useAuthorization";
import { User } from "@/services/authService";
import userService from "@/services/userService";

// Custom Components
import UserFormModal from "./UserFormModal";
import ConfirmationDialog from "@/components/common/ConfirmationDialog";

const UsersListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthorization();

  // --- Search & Pagination State ---
  const initialSearch = searchParams.get("search") || "";
  const initialPage = Number(searchParams.get("page") || "1");

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);

  // Debounce logic
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

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
    setSearchParams((prev) => {
      prev.set("page", value.toString());
      return prev;
    });
  };

  // --- React Query for Users ---
  const {
    data: usersResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["users", page, debouncedSearch],
    queryFn: () => userService.getUsers(page, debouncedSearch),
    placeholderData: (previousData) => previousData,
  });

  // --- React Query for Roles ---
  const { data: availableRoles = [] } = useQuery({
    queryKey: ["roles-list"],
    queryFn: userService.getRoles,
    staleTime: 5 * 60 * 1000,
  });

  // --- Modal & Action State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Handlers ---
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

  const openConfirmDialog = (id: number) => {
    setUserToDeleteId(id);
    setIsConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    if (!isDeleting) {
      setIsConfirmOpen(false);
      setTimeout(() => setUserToDeleteId(null), 300);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDeleteId) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(userToDeleteId);
      toast.success("تم الحذف بنجاح");
      closeConfirmDialog();
      refetch();
    } catch (err: any) {
      toast.error("حدث خطأ", {
        description: userService.getErrorMessage(err),
      });
      closeConfirmDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Container maxWidth="xl">
      {/* Header Section */}
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            إدارة المستخدمين
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة حسابات المستخدمين، الصلاحيات، والمستودعات المرتبطة بهم
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={() => openModal()}
        >
          مستخدم جديد
        </Button>
      </Box>

      {/* Search & Filter Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              fullWidth
              variant="outlined"
              placeholder="ابحث عن مستخدم بالاسم أو اسم المستخدم..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={20} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm("")}
                    >
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {usersResponse && (
              <Chip label={`${usersResponse.total} مستخدم`} />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableCell key={i}>
                      <Skeleton height={24} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <TableCell key={j}>
                        <Skeleton height={40} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert severity="error" sx={{ mb: 4 }}>
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          {error instanceof Error
            ? error.message
            : "حدث خطأ غير متوقع أثناء الاتصال بالخادم."}
        </Alert>
      )}

      {/* Data Table */}
      {!isLoading && !isError && usersResponse && (
        <Card>
          <TableContainer>
            <Table aria-label="users table">
              <TableHead>
                <TableRow>
                  <TableCell className="text-center" align="center">المستخدم</TableCell>
                  <TableCell className="text-center" align="center">اسم الدخول</TableCell>
                  <TableCell className="text-center" align="center">الأدوار</TableCell>
                  <TableCell className="text-center" align="center">المستودع</TableCell>
                  <TableCell className="text-center" align="center">الإجراءات</TableCell>
                </TableRow>
              </TableHead>
                <TableBody>
                  {usersResponse.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Stack alignItems="center" spacing={2}>
                          <Users size={48} />
                          <Typography variant="h6" color="text.secondary">
                            لا توجد نتائج مطابقة
                          </Typography>
                          <Typography variant="body2" color="text.disabled">
                            حاول ضبط مصطلحات البحث الخاصة بك
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersResponse.data.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell className="text-center" align="center">
                       
                            <Box>
                              <Typography variant="subtitle2">
                                {user.name}
                              </Typography>
                              {user.id === currentUser?.id && (
                                <Chip label="أنت" size="small" />
                              )}
                            </Box>
                        </TableCell>
                        <TableCell className="text-center" align="center">
                          <Typography variant="body2" fontFamily="monospace">
                            @{user.username}
                          </Typography>
                        </TableCell>
                        <TableCell className="text-center" align="center">
                          <Stack
                            direction="row"
                            flexWrap="wrap"
                            gap={0.5}
                            justifyContent="center"
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
                                />
                              );
                            })}
                          </Stack>
                        </TableCell>
                        <TableCell className="text-center" align="center">
                          {user.warehouse ? (
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Store size={16} />
                              <Typography variant="body2">
                                {user.warehouse.name}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.disabled">
                              غير محدد
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell className="text-center" align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="تعديل البيانات">
                              <IconButton size="small" onClick={() => openModal(user)}>
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            {currentUser?.id !== user.id && (
                              <Tooltip title="حذف المستخدم">
                                <IconButton
                                  size="small"
                                  onClick={() => openConfirmDialog(user.id)}
                                  disabled={isDeleting}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
      )}

      {/* Pagination */}
      {!isLoading && !isError && usersResponse && usersResponse.last_page > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={usersResponse.last_page}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Modals */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        userToEdit={editingUser}
        onSaveSuccess={handleSaveSuccess}
        availableRoles={availableRoles}
      />

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleDeleteConfirm}
        title="تأكيد حذف المستخدم"
        message={`هل أنت متأكد تماماً من رغبتك في حذف هذا المستخدم؟
هذا الإجراء نهائي ولا يمكن استرجاع البيانات المحذوفة.`}
        confirmText="نعم، احذف"
        cancelText="إلغاء الأمر"
        isLoading={isDeleting}
      />
    </Container>
  );
};

export default UsersListPage;
