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
  CircularProgress,
  Alert,
  AlertTitle,
  Tooltip,
  Stack,
  useTheme,
  alpha,
  Avatar,
  Badge,
  Fade,
  Skeleton,
} from "@mui/material";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Users,
  Store,
  User as UserIcon,
  Filter,
  X,
  MoreVertical,
  Mail,
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
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser } = useAuthorization();

  // --- Search & Pagination State ---
  const initialSearch = searchParams.get("search") || "";
  const initialPage = Number(searchParams.get("page") || "1");

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(initialPage);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 3, md: 4 },
        direction: "rtl",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Header Section */}
      <Fade in timeout={600}>
        <Box
          sx={{
            mb: 4,
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", sm: "flex-start" },
            gap: 3,
          }}
        >
          <Box>
            <Typography
              variant="h4"
              component="h1"
              fontWeight={800}
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                color: "text.primary",
                mb: 1,
                fontSize: { xs: "1.75rem", md: "2.125rem" },
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users
                  size={28}
                  style={{ color: theme.palette.primary.main }}
                />
              </Box>
              إدارة المستخدمين
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ fontSize: { xs: "0.875rem", md: "1rem" } }}
            >
              إدارة حسابات المستخدمين، الصلاحيات، والمستودعات المرتبطة بهم
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="large"
            startIcon={<Plus size={20} />}
            onClick={() => openModal()}
            sx={{
              fontWeight: 700,
              px: 4,
              py: 1.5,
              borderRadius: 3,
              boxShadow: `0 4px 14px 0 ${alpha(theme.palette.primary.main, 0.39)}`,
              textTransform: "none",
              fontSize: "0.9375rem",
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              "&:hover": {
                boxShadow: `0 6px 20px 0 ${alpha(theme.palette.primary.main, 0.5)}`,
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              },
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            مستخدم جديد
          </Button>
        </Box>
      </Fade>

      {/* Search & Filter Card */}
      <Fade in timeout={800}>
        <Card
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 4,
            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            bgcolor: "background.paper",
            boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
            transition: "all 0.3s ease",
            "&:hover": {
              boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.08)}`,
            },
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ position: "relative", flex: 1 }}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="ابحث عن مستخدم بالاسم أو اسم المستخدم..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search
                          size={20}
                          style={{
                            color: isSearchFocused
                              ? theme.palette.primary.main
                              : theme.palette.text.disabled,
                            transition: "color 0.2s",
                          }}
                        />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchTerm("")}
                          sx={{ p: 0.5 }}
                        >
                          <X size={16} />
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 3,
                      bgcolor: "background.default",
                      transition: "all 0.2s",
                      "& fieldset": {
                        borderColor: isSearchFocused
                          ? theme.palette.primary.main
                          : "transparent",
                        borderWidth: isSearchFocused ? 2 : 1,
                      },
                      "&:hover fieldset": {
                        borderColor: theme.palette.primary.main,
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: `${theme.palette.primary.main} !important`,
                        borderWidth: 2,
                      },
                    },
                  }}
                  size="medium"
                />
              </Box>
              {usersResponse && (
                <Chip
                  label={`${usersResponse.total} مستخدم`}
                  sx={{
                    height: 40,
                    fontWeight: 600,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                />
              )}
            </Stack>
          </CardContent>
        </Card>
      </Fade>

      {/* Loading State */}
      {isLoading && (
        <Fade in timeout={400}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              overflow: "hidden",
            }}
          >
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
        </Fade>
      )}

      {/* Error State */}
      {isError && (
        <Fade in timeout={400}>
          <Alert
            severity="error"
            variant="filled"
            icon={<AlertCircle size={24} />}
            sx={{
              mb: 4,
              borderRadius: 3,
              boxShadow: theme.shadows[4],
            }}
          >
            <AlertTitle sx={{ fontWeight: "bold", mb: 0.5 }}>
              خطأ في تحميل البيانات
            </AlertTitle>
            {error instanceof Error
              ? error.message
              : "حدث خطأ غير متوقع أثناء الاتصال بالخادم."}
          </Alert>
        </Fade>
      )}

      {/* Data Table */}
      {!isLoading && !isError && usersResponse && (
        <Fade in timeout={600}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 4,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              overflow: "hidden",
              boxShadow: `0 2px 8px ${alpha(theme.palette.common.black, 0.04)}`,
            }}
          >
            <TableContainer>
              <Table sx={{ minWidth: 700 }} aria-label="users table">
                <TableHead>
                  <TableRow
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      "& th": {
                        borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        fontWeight: 700,
                        py: 2.5,
                        fontSize: "0.875rem",
                        color: "text.primary",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        textAlign: "center",
                      },
                    }}
                  >
                    <TableCell align="center">المستخدم</TableCell>
                    <TableCell align="center">اسم الدخول</TableCell>
                    <TableCell align="center">الأدوار</TableCell>
                    <TableCell align="center">المستودع</TableCell>
                    <TableCell align="center" sx={{ width: 120 }}>
                      الإجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {usersResponse.data.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        align="center"
                        sx={{ py: 10, textAlign: "center" }}
                      >
                        <Stack alignItems="center" spacing={3}>
                          <Box
                            sx={{
                              p: 3,
                              borderRadius: "50%",
                              bgcolor: alpha(theme.palette.text.disabled, 0.1),
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Users
                              size={48}
                              style={{ color: theme.palette.text.disabled }}
                            />
                          </Box>
                          <Box textAlign="center">
                            <Typography
                              variant="h6"
                              color="text.secondary"
                              fontWeight={600}
                              gutterBottom
                            >
                              لا توجد نتائج مطابقة
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.disabled"
                            >
                              حاول ضبط مصطلحات البحث الخاصة بك
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : (
                    usersResponse.data.map((user, index) => (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{
                          "&:last-child td, &:last-child th": { border: 0 },
                          transition: "all 0.2s ease",
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                            transform: "translateX(-2px)",
                          },
                          "& td": {
                            textAlign: "center",
                            verticalAlign: "middle",
                          },
                        }}
                      >
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                          >
                            <Badge
                              overlap="circular"
                              anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                              }}
                              badgeContent={
                                user.id === currentUser?.id ? (
                                  <Box
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      bgcolor: theme.palette.success.main,
                                      border: `2px solid ${theme.palette.background.paper}`,
                                    }}
                                  />
                                ) : null
                              }
                            >
                              <Avatar
                                sx={{
                                  width: 44,
                                  height: 44,
                                  bgcolor: theme.palette.primary.main,
                                  fontWeight: 700,
                                  fontSize: "0.875rem",
                                  boxShadow: theme.shadows[2],
                                }}
                              >
                                {getInitials(user.name)}
                              </Avatar>
                            </Badge>
                            <Box>
                              <Typography
                                variant="subtitle2"
                                fontWeight={600}
                                sx={{ mb: 0.5 }}
                              >
                                {user.name}
                              </Typography>
                              {user.id === currentUser?.id && (
                                <Chip
                                  label="أنت"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.7rem",
                                    bgcolor: alpha(
                                      theme.palette.success.main,
                                      0.1
                                    ),
                                    color: theme.palette.success.main,
                                    fontWeight: 600,
                                  }}
                                />
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontFamily="monospace"
                            color="text.secondary"
                            sx={{
                              bgcolor: alpha(theme.palette.text.secondary, 0.05),
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1.5,
                              display: "inline-block",
                            }}
                          >
                            @{user.username}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            flexWrap="wrap"
                            gap={0.75}
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
                                  icon={
                                    isAdmin ? (
                                      <ShieldCheck size={14} />
                                    ) : (
                                      <UserIcon size={14} />
                                    )
                                  }
                                  color={isAdmin ? "primary" : "default"}
                                  variant={isAdmin ? "filled" : "outlined"}
                                  sx={{
                                    fontWeight: 600,
                                    fontSize: "0.75rem",
                                    height: 24,
                                    "& .MuiChip-icon": {
                                      ml: 0.5,
                                    },
                                  }}
                                />
                              );
                            })}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          {user.warehouse ? (
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              sx={{
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 2,
                                bgcolor: alpha(
                                  theme.palette.info.main,
                                  0.08
                                ),
                                display: "inline-flex",
                              }}
                            >
                              <Store
                                size={16}
                                style={{ color: theme.palette.info.main }}
                              />
                              <Typography
                                variant="body2"
                                fontWeight={500}
                                color="text.primary"
                              >
                                {user.warehouse.name}
                              </Typography>
                            </Stack>
                          ) : (
                            <Typography
                              variant="caption"
                              color="text.disabled"
                              sx={{
                                fontStyle: "italic",
                              }}
                            >
                              غير محدد
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="center"
                          >
                            <Tooltip title="تعديل البيانات" arrow>
                              <IconButton
                                size="small"
                                onClick={() => openModal(user)}
                                sx={{
                                  color: theme.palette.primary.main,
                                  bgcolor: alpha(
                                    theme.palette.primary.main,
                                    0.08
                                  ),
                                  "&:hover": {
                                    bgcolor: alpha(
                                      theme.palette.primary.main,
                                      0.16
                                    ),
                                    transform: "scale(1.1)",
                                  },
                                  transition: "all 0.2s",
                                  width: 36,
                                  height: 36,
                                }}
                              >
                                <Edit size={16} />
                              </IconButton>
                            </Tooltip>
                            {currentUser?.id !== user.id && (
                              <Tooltip title="حذف المستخدم" arrow>
                                <IconButton
                                  size="small"
                                  onClick={() => openConfirmDialog(user.id)}
                                  sx={{
                                    color: theme.palette.error.main,
                                    bgcolor: alpha(theme.palette.error.main, 0.08),
                                    "&:hover": {
                                      bgcolor: alpha(
                                        theme.palette.error.main,
                                        0.16
                                      ),
                                      transform: "scale(1.1)",
                                    },
                                    transition: "all 0.2s",
                                    width: 36,
                                    height: 36,
                                  }}
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
        </Fade>
      )}

      {/* Pagination */}
      {!isLoading && !isError && usersResponse && usersResponse.last_page > 1 && (
        <Fade in timeout={800}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              mt: 4,
              width: "100%",
            }}
          >
            <Pagination
              count={usersResponse.last_page}
              page={page}
              onChange={handlePageChange}
              color="primary"
              size="large"
              shape="rounded"
              showFirstButton
              showLastButton
              sx={{
                "& .MuiPagination-ul": {
                  gap: 1,
                },
                "& .MuiPaginationItem-root": {
                  fontWeight: 600,
                  "&.Mui-selected": {
                    boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                  },
                },
              }}
            />
          </Box>
        </Fade>
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
