// src/pages/admin/UsersListPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge"; // For displaying roles
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from '@/components/ui/pagination'; // Assuming pagination component
import { Loader2, Search, AlertCircle, ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

// Services and Types
import { useAuthorization } from '@/hooks/useAuthorization'; // For permission checks

// Custom Components
import { PaginatedResponse } from '@/services/clientService';
import { User } from '@/services/authService';
import userService, { Role } from '@/services/userService';
import UserFormModal from './UserFormModal';
import ConfirmationDialog from '@/components/common/ConfirmationDialog';

const UsersListPage: React.FC = () => {
    const { t } = useTranslation(['users', 'roles', 'common']);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { can, user: currentUser } = useAuthorization(); // Check permissions and current user

    // --- State ---
    const [usersResponse, setUsersResponse] = useState<PaginatedResponse<User> | null>(null);
    const [availableRoles, setAvailableRoles] = useState<Role[]>([]); // For the modal
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('search') || '');
    const currentPage = useMemo(() => Number(searchParams.get('page') || '1'), [searchParams]);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    // Deletion State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [userToDeleteId, setUserToDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Debounce Search ---
    useEffect(() => { /* ... Debounce logic for searchTerm -> debouncedSearchTerm ... */ }, [searchTerm]);

    // --- Fetch Users ---
    const fetchUsers = useCallback(async (page: number, search: string) => {
        setIsLoading(true); setError(null);
        try {
            const data = await userService.getUsers(page, search);
            setUsersResponse(data);
        } catch (err) { setError(userService.getErrorMessage(err)); }
        finally { setIsLoading(false); }
    }, []);

    // --- Fetch Roles (for Modal) ---
    const fetchRoles = useCallback(async () => {
        try {
            const data = await userService.getRoles();
            setAvailableRoles(data);
        } catch (err) { toast.error(t('roles:fetchError'), { description: userService.getErrorMessage(err) }); }
    }, [t]);

    // --- Effects ---
    useEffect(() => { // Fetch users when page or debounced search changes
        fetchUsers(currentPage, debouncedSearchTerm);
    }, [fetchUsers, currentPage, debouncedSearchTerm]);

    useEffect(() => { // Fetch roles once on mount
        fetchRoles();
    }, [fetchRoles]);

    // --- Handlers ---
    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value);
    const handlePageChange = (newPage: number) => { const params = new URLSearchParams(searchParams); params.set('page', newPage.toString()); setSearchParams(params); };
    const openModal = (user: User | null = null) => { setEditingUser(user); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingUser(null); };
    const handleSaveSuccess = (savedUser: User) => { closeModal(); fetchUsers(currentPage, debouncedSearchTerm); }; // Refetch current page
    const openConfirmDialog = (id: number) => { setUserToDeleteId(id); setIsConfirmOpen(true); };
    const closeConfirmDialog = () => { if (!isDeleting) { setIsConfirmOpen(false); setTimeout(() => setUserToDeleteId(null), 300); } };
    const handleDeleteConfirm = async () => { '/* ... call userService.deleteUser, handle state, refetch ... */ '};

    // --- Render ---
    return (
        <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
            {/* Header & Add Button */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">{t('users:manageTitle')}</h1>
                {can('create-users') && ( <Button onClick={() => openModal()}><Plus className="me-2 h-4 w-4" /> {t('users:addUser')}</Button> )}
            </div>
             {/* Search Input */}
             <div className="mb-4 max-w-sm"><Input placeholder={t('users:searchPlaceholder')} value={searchTerm} onChange={handleSearchChange} startIcon={<Search className="h-4 w-4 text-muted-foreground" />}/></div> {/* Add startIcon to Input if supported */}


        {/* Loading / Error */}
        {isLoading && (
            <div className="flex justify-center items-center py-4">
                <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
            </div>
        )}
        {!isLoading && error && (
            <Alert variant="destructive">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <div>
                        <AlertTitle>{t('common:error')}</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </div>
                </div>
            </Alert>
        )}

            {/* User Table */}
            {!isLoading && !error && usersResponse && (
                <>
                <Card className="dark:bg-gray-900">
                    <CardContent className="p-0"> {/* Remove padding if table has its own */}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">{t('users:nameLabel')}</TableHead>
                                    <TableHead className="text-center">{t('users:emailLabel')}</TableHead>
                                    <TableHead className="text-center">{t('roles:roles')}</TableHead> {/* Use roles namespace */}
                                    <TableHead className="text-center">{t('common:actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {usersResponse.data.length === 0 && ( '/* ... No Results Row ... */' )}
                                {usersResponse.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-center">{user.name}</TableCell>
                                        <TableCell className="text-center">{user.email}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                 {(user.roles ?? []).map(roleName => (
                                                     <Badge key={roleName} variant="secondary">{t(`roles:${roleName}`, { defaultValue: roleName })}</Badge>
                                                 ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center items-center gap-1">
                                                 {can('edit-users') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openModal(user)}><Edit className="h-4 w-4" /></Button>}
                                                 {/* Prevent self-deletion and check permission */}
                                                 {can('delete-users') && currentUser?.id !== user.id && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => openConfirmDialog(user.id)} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                           
                                
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 {/* Pagination */}
                 {usersResponse.last_page > 1 && ( '/* ... Pagination Component ... */ ')}
                </>
            )}

            {/* Modals */}
            <UserFormModal
                isOpen={isModalOpen}
                onClose={closeModal}
                userToEdit={editingUser}
                onSaveSuccess={handleSaveSuccess}
                availableRoles={availableRoles} // Pass fetched roles
            />
            <ConfirmationDialog
                open={isConfirmOpen}
                onClose={closeConfirmDialog}
                onConfirm={handleDeleteConfirm}
                title={t('common:confirmDeleteTitle')}
                message={t('users:deleteConfirm')} // Add key
                confirmText={t('common:delete')}
                cancelText={t('common:cancel')}
                isLoading={isDeleting}
            />
        </div>
    );
};

export default UsersListPage;