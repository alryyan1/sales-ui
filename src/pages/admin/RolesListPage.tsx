// src/pages/admin/RolesListPage.tsx
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// MUI Components
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  CircularProgress,
  Alert,
  AlertTitle,
  Pagination,
  Stack,
  Tooltip,
  Container,
} from "@mui/material";

// Icons
import {
  Edit,
  Plus,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Users,
} from "lucide-react";

// Services and Types
import roleService, {
  RoleWithPermissions,
  Permission,
} from "../../services/roleService";
import { PaginatedResponse } from "@/services/clientService";

// Custom Components
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import RoleFormModal from "@/components/admin/users/roles/RoleFormModal";

const RolesListPage: React.FC = () => {
  // --- State ---
  const [rolesResponse, setRolesResponse] =
    useState<PaginatedResponse<RoleWithPermissions> | null>(null);
  const [availablePermissions, setAvailablePermissions] = useState<
    Permission[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(
    null
  );

  // Deletion State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [roleToDeleteId, setRoleToDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- Fetch Roles ---
  const fetchRoles = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await roleService.getRoles(page);
      setRolesResponse(data);
    } catch (err) {
      setError(roleService.getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Fetch Permissions ---
  const fetchPermissions = useCallback(async () => {
    setLoadingPermissions(true);
    try {
      const data = await roleService.getPermissions();
      setAvailablePermissions(data);
    } catch (err) {
      toast.error("خطأ في جلب الصلاحيات", {
        description: roleService.getErrorMessage(err),
      });
    } finally {
      setLoadingPermissions(false);
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    fetchRoles(currentPage);
  }, [fetchRoles, currentPage]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  // --- Handlers ---
  const openModal = (role: RoleWithPermissions | null = null) => {
    setEditingRole(role);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
  };

  const handleSaveSuccess = () => {
    closeModal();
    fetchRoles(currentPage);
  };

  const openConfirmDialog = (id: number) => {
    setRoleToDeleteId(id);
    setIsConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    if (!isDeleting) {
      setIsConfirmOpen(false);
      setTimeout(() => setRoleToDeleteId(null), 300);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDeleteId) return;
    setIsDeleting(true);
    try {
      await roleService.deleteRole(roleToDeleteId);
      toast.success("تم بنجاح", { description: "تم حذف الدور بنجاح" });
      closeConfirmDialog();
      // Refetch, potentially adjusting page
      if (rolesResponse && rolesResponse.data.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchRoles(currentPage);
      }
    } catch (err) {
      toast.error("خطأ", { description: roleService.getErrorMessage(err) });
      closeConfirmDialog();
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  // --- Render ---
  return (
    <Container maxWidth="xl" dir="rtl" sx={{ py: 4, minHeight: "100vh" }}>
      {/* Header & Add Button */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "start", sm: "center" },
          mb: 4,
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            component="h1"
            fontWeight="bold"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <ShieldCheck className="h-8 w-8 text-primary" />
            إدارة الأدوار
          </Typography>
          <Typography variant="body1" color="text.secondary">
            إدارة أدوار المستخدمين وصلاحياتهم في النظام
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={() => openModal()}
          disabled={loadingPermissions}
          startIcon={<Plus className="h-5 w-5" />}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          إضافة دور جديد
        </Button>
      </Box>

      {/* Loading */}
      {(isLoading || loadingPermissions) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            py: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {!isLoading && error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          icon={<AlertCircle className="h-4 w-4" />}
        >
          <AlertTitle>خطأ</AlertTitle>
          {error}
        </Alert>
      )}

      {/* Roles Table */}
      {!isLoading && !error && rolesResponse && (
        <>
          <Card
            elevation={0}
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ p: 0 }}>
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ borderRadius: 0 }}
              >
                <Table sx={{ minWidth: 650 }}>
                  <TableHead sx={{ bgcolor: "action.hover" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        اسم الدور
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        عدد الصلاحيات
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold" }}>
                        عدد المستخدمين
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: "bold" }}>
                        إجراءات
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rolesResponse.data.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                          <Typography variant="body1" color="text.secondary">
                            لا توجد أدوار متاحة حالياً
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      rolesResponse.data.map((role) => (
                        <TableRow
                          key={role.id}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 },
                            "&:hover": { bgcolor: "action.hover" },
                          }}
                        >
                          <TableCell component="th" scope="row">
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  p: 1,
                                  borderRadius: "50%",
                                  bgcolor:
                                    role.name === "admin"
                                      ? "primary.light"
                                      : "action.selected",
                                  color:
                                    role.name === "admin"
                                      ? "primary.main"
                                      : "text.primary",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Box>
                              <Typography variant="body2" fontWeight={500}>
                                {role.name === "admin"
                                  ? "مدير النظام"
                                  : role.name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Box
                                component="span"
                                sx={{
                                  px: 1.5,
                                  py: 0.5,
                                  bgcolor: "action.selected",
                                  borderRadius: 1,
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}
                              >
                                {role.permissions_count ?? 0}
                              </Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                صلاحية
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Users className="h-4 w-4 text-gray-400" />
                              <Typography variant="body2">
                                {role.users_count ?? 0}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Stack
                              direction="row"
                              spacing={1}
                              justifyContent="center"
                            >
                              <Tooltip title="تعديل">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => openModal(role)}
                                    disabled={loadingPermissions}
                                    color="primary"
                                    sx={{
                                      bgcolor: "primary.lighter",
                                      "&:hover": {
                                        bgcolor: "primary.light",
                                        color: "primary.contrastText",
                                      },
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </IconButton>
                                </span>
                              </Tooltip>

                              {role.name !== "admin" && (
                                <Tooltip title="حذف">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => openConfirmDialog(role.id)}
                                    disabled={isDeleting}
                                    sx={{
                                      bgcolor: "error.lighter",
                                      "&:hover": {
                                        bgcolor: "error.light",
                                        color: "error.contrastText",
                                      },
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
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
            </CardContent>
          </Card>

          {/* Pagination */}
          {rolesResponse.last_page > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <Pagination
                count={rolesResponse.last_page}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Modals */}
      <RoleFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        roleToEdit={editingRole}
        onSaveSuccess={handleSaveSuccess}
        availablePermissions={availablePermissions}
        loadingPermissions={loadingPermissions}
      />

      <ConfirmationDialog
        open={isConfirmOpen}
        onClose={closeConfirmDialog}
        onConfirm={handleDeleteConfirm}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا الدور؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="حذف"
        cancelText="إلغاء"
        isLoading={isDeleting}
      />
    </Container>
  );
};

export default RolesListPage;
