// src/components/admin/users/UsersListPage.tsx
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Search,
  Plus,
  Edit,
  Users,
  Store,
  X,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Services and Types
import { useAuthorization } from "@/hooks/useAuthorization";
import { User } from "@/services/authService";
import userService from "@/services/userService";

// Custom Components
import UserFormModal from "./UserFormModal";

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

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams((prev) => {
      prev.set("page", newPage.toString());
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

  return (
    <div className="container mx-auto max-w-7xl p-6" dir="rtl">
      {/* Header Section */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            إدارة حسابات المستخدمين، الصلاحيات، والمستودعات المرتبطة بهم
          </p>
        </div>

        <Button onClick={() => openModal()}>
          <Plus className="mr-2 h-4 w-4" />
          مستخدم جديد
        </Button>
      </div>

      {/* Search & Filter Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مستخدم بالاسم أو اسم المستخدم..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-1 top-1/2 h-6 w-6 -translate-y-1/2"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {usersResponse && (
              <Badge variant="secondary" className="text-sm">
                {usersResponse.total} مستخدم
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableHead key={i} className="text-center">
                      <Skeleton className="h-5 w-24" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    {[1, 2, 3, 4, 5].map((j) => (
                      <TableCell key={j} className="text-center">
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {isError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ في تحميل البيانات</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "حدث خطأ غير متوقع أثناء الاتصال بالخادم."}
          </AlertDescription>
        </Alert>
      )}

      {/* Data Table */}
      {!isLoading && !isError && usersResponse && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">المستخدم</TableHead>
                  <TableHead className="text-center">اسم الدخول</TableHead>
                  <TableHead className="text-center">الأدوار</TableHead>
                  <TableHead className="text-center">المستودع</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersResponse.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <Users className="h-12 w-12 text-muted-foreground" />
                        <div className="text-center">
                          <h3 className="text-lg font-semibold text-muted-foreground">
                            لا توجد نتائج مطابقة
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            حاول ضبط مصطلحات البحث الخاصة بك
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  usersResponse.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-medium">{user.name}</span>
                          {user.id === currentUser?.id && (
                            <Badge variant="default" className="text-xs">
                              أنت
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">@{user.username}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {(user.roles ?? []).map((roleName) => {
                            const isAdmin =
                              roleName === "admin" || roleName === "ادمن";
                            return (
                              <Badge
                                key={roleName}
                                variant={isAdmin ? "default" : "outline"}
                                className="text-xs"
                              >
                                {roleName}
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.warehouse ? (
                          <div className="flex items-center justify-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{user.warehouse.name}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            غير محدد
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openModal(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>تعديل البيانات</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading &&
        !isError &&
        usersResponse &&
        usersResponse.last_page > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination>
              <PaginationContent>
                {page > 1 && (
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page - 1);
                      }}
                    />
                  </PaginationItem>
                )}

                {Array.from({ length: usersResponse.last_page }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first page, last page, current page, and pages around current
                    return (
                      p === 1 ||
                      p === usersResponse.last_page ||
                      (p >= page - 1 && p <= page + 1)
                    );
                  })
                  .map((p, index, array) => {
                    // Add ellipsis if there's a gap
                    const prevPage = array[index - 1];
                    const showEllipsis = prevPage && p - prevPage > 1;

                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(p);
                            }}
                            isActive={p === page}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    );
                  })}

                {page < usersResponse.last_page && (
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(page + 1);
                      }}
                    />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}

      {/* Modals */}
      <UserFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        userToEdit={editingUser}
        onSaveSuccess={handleSaveSuccess}
        availableRoles={availableRoles}
      />
    </div>
  );
};

export default UsersListPage;
