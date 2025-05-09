// src/pages/admin/RolesListPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Pagination } from '@/components/ui/pagination'; // Assuming pagination component
import { Loader2, AlertCircle, ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';

// Services and Types
import roleService, { RoleWithPermissions, Permission, PaginatedResponse } from '../../services/roleService'; // Adjust path
import { useAuthorization } from '@/hooks/useAuthorization';

// Custom Components
import ConfirmationDialog from '../../components/common/ConfirmationDialog'; // Adjust path
import RoleFormModal from '@/components/admin/users/roles/RoleFormModal';

// --- Component ---
const RolesListPage: React.FC = () => {
    const { t } = useTranslation(['roles', 'common', 'permissions']);
    const navigate = useNavigate();
    const { can } = useAuthorization(); // Permission checks

    // --- State ---
    const [rolesResponse, setRolesResponse] = useState<PaginatedResponse<RoleWithPermissions> | null>(null);
    const [availablePermissions, setAvailablePermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Combined loading
    const [loadingPermissions, setLoadingPermissions] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1); // Simple state pagination for now
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null);
    // Deletion State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [roleToDeleteId, setRoleToDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);


    // --- Fetch Roles ---
    const fetchRoles = useCallback(async (page: number) => {
        setIsLoading(true); setError(null);
        try {
            const data = await roleService.getRoles(page);
            setRolesResponse(data);
        } catch (err) { setError(roleService.getErrorMessage(err)); }
        finally { setIsLoading(false); }
    }, []);

    // --- Fetch Permissions ---
    const fetchPermissions = useCallback(async () => {
        setLoadingPermissions(true);
        try {
            const data = await roleService.getPermissions();
            setAvailablePermissions(data);
        } catch (err) { toast.error(t('permissions:fetchError'), { description: roleService.getErrorMessage(err) }); }
        finally { setLoadingPermissions(false); }
    }, [t]);

    // --- Effects ---
    useEffect(() => { fetchRoles(currentPage); }, [fetchRoles, currentPage]);
    useEffect(() => { fetchPermissions(); }, [fetchPermissions]);

    // --- Handlers ---
    const handlePageChange = (newPage: number) => { setCurrentPage(newPage); };
    const openModal = (role: RoleWithPermissions | null = null) => { setEditingRole(role); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingRole(null); };
    const handleSaveSuccess = (savedRole: RoleWithPermissions) => { closeModal(); fetchRoles(currentPage); }; // Refetch roles list
    const openConfirmDialog = (id: number) => { setRoleToDeleteId(id); setIsConfirmOpen(true); };
    const closeConfirmDialog = () => { if (!isDeleting) { setIsConfirmOpen(false); setTimeout(() => setRoleToDeleteId(null), 300); } };
    const handleDeleteConfirm = async () => {
         if (!roleToDeleteId) return; setIsDeleting(true);
         try {
             await roleService.deleteRole(roleToDeleteId);
             toast.success(t('common:success'), { description: t('roles:deleteSuccess') });
             closeConfirmDialog();
             // Refetch potentially adjusting page
             if (rolesResponse && rolesResponse.data.length === 1 && currentPage > 1) { setCurrentPage(prev => prev - 1); }
             else { fetchRoles(currentPage); }
         } catch (err) { toast.error(t('common:error'), { description: roleService.getErrorMessage(err) }); closeConfirmDialog(); }
         finally { setIsDeleting(false); }
     };

    // --- Render ---
    return (
        <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
             {/* Header & Add Button */}
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">{t('roles:manageTitle')}</h1>
                 {/* Check permission to create roles */}
                 {can('manage-roles') && ( <Button onClick={() => openModal()} disabled={loadingPermissions}><Plus className="me-2 h-4 w-4" /> {t('roles:addRole')}</Button> )}
            </div>

             {/* Loading / Error */}
             {(isLoading || loadingPermissions) && ( '/* ... Loader ... */ ')}
             {!isLoading && error && ( '/* ... Error Alert ... */' )}

             {/* Roles Table */}
             {!isLoading && !error && rolesResponse && (
                <>
                <Card className="dark:bg-gray-900">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('roles:roleName')}</TableHead>
                                    <TableHead>{t('roles:permissionsCount')}</TableHead> {/* Add key */}
                                    <TableHead>{t('users:usersCount')}</TableHead> {/* Add key */}
                                    <TableHead className="text-center">{t('common:actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {rolesResponse.data.length === 0 && ( '/* ... No Results Row ... */' )}
                                {rolesResponse.data.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{t(`roles:${role.name}`, { defaultValue: role.name })}</TableCell>
                                        <TableCell>{role.permissions_count ?? t('common:n/a')}</TableCell>
                                        <TableCell>{role.users_count ?? t('common:n/a')}</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center items-center gap-1">
                                                {/* Edit action needs permission check */}
                                                 {can('manage-roles') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openModal(role)} disabled={loadingPermissions}><Edit className="h-4 w-4" /></Button>}
                                                 {/* Delete action needs permission check & prevent deleting admin role */}
                                                 {can('manage-roles') && role.name !== 'admin' && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => openConfirmDialog(role.id)} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 {/* Pagination */}
                 {rolesResponse.last_page > 1 && ( '/* ... Pagination Component ... */' )}
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
                title={t('common:confirmDeleteTitle')}
                message={t('roles:deleteConfirm')} // Add key
                confirmText={t('common:delete')}
                cancelText={t('common:cancel')}
                isLoading={isDeleting}
            />

        </div>
    );
};

export default RolesListPage;