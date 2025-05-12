// src/pages/admin/CategoriesListPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from "sonner";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Loader2, ArrowLeft, Plus, Edit, Trash2, Search } from 'lucide-react'; // AlertTriangle for delete conflict

// Services and Types
import { useAuthorization } from '@/hooks/useAuthorization';

// Custom Components
import ConfirmationDialog from '../../components/common/ConfirmationDialog'; // Adjust path
import { Alert } from '@mui/material';
import categoryService, { Category } from '@/services/CategoryService';
import CategoryFormModal from '@/components/admin/users/categories/CategoryFormModal';
import { PaginatedResponse } from '@/services/clientService';
// import { Pagination } from '@/components/ui/pagination'; // shadcn pagination

const CategoriesListPage: React.FC = () => {
    const { t } = useTranslation(['categories', 'common']);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { can } = useAuthorization();

    // --- State ---
    const [categoriesResponse, setCategoriesResponse] = useState<PaginatedResponse<Category> | null>(null);
    const [allCategoriesFlat, setAllCategoriesFlat] = useState<Category[]>([]); // For parent dropdown
    const [isLoading, setIsLoading] = useState(true);
    const [loadingFlatCategories, setLoadingFlatCategories] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // const [currentPage, setCurrentPage] = useState(1); // For pagination
    // Filters & Pagination
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(() => searchParams.get('search') || '');
    const currentPage = useMemo(() => Number(searchParams.get('page') || '1'), [searchParams]);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    // Deletion State
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [categoryToDeleteId, setCategoryToDeleteId] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Debounce Search ---
    useEffect(() => { /* ... Debounce logic for searchTerm -> debouncedSearchTerm ... */ }, [searchTerm]);

    // --- Fetch Categories (Paginated for list) ---
    const fetchCategories = useCallback(async (page: number, search: string) => {
        setIsLoading(true); setError(null);
        try {
            const data = await categoryService.getCategories(page, 15, search);
            setCategoriesResponse(data as PaginatedResponse<Category>); // Cast
        } catch (err) { setError(categoryService.getErrorMessage(err)); }
        finally { setIsLoading(false); }
    }, []);

    // --- Fetch All Categories (Flat for Parent Dropdown) ---
    const fetchAllFlatCategories = useCallback(async () => {
        setLoadingFlatCategories(true);
        try {
            const data = await categoryService.getCategories(1, 9999, '', false, true); // allFlat=true
            setAllCategoriesFlat(data as Category[]); // Cast
        } catch (err) { toast.error(t('common:error'), { description: categoryService.getErrorMessage(err) }); }
        finally { setLoadingFlatCategories(false); }
    }, [t]);


    useEffect(() => { fetchCategories(currentPage, debouncedSearchTerm); }, [fetchCategories, currentPage, debouncedSearchTerm]);
    useEffect(() => { fetchAllFlatCategories(); }, [fetchAllFlatCategories]);

    // --- Handlers ---
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
    const handlePageChange = (newPage: number) => { /* ... update searchParams ... */ };
    const openModal = (category: Category | null = null) => { setEditingCategory(category); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingCategory(null); };
    const handleSaveSuccess = (savedCategory: Category) => { closeModal(); fetchCategories(currentPage, debouncedSearchTerm); fetchAllFlatCategories(); };
    const openConfirmDialog = (id: number) => { setCategoryToDeleteId(id); setIsConfirmOpen(true); };
    const closeConfirmDialog = () =>  setIsConfirmOpen(false)
    const handleDeleteConfirm = async () => {
         if (!categoryToDeleteId) return; setIsDeleting(true);
         try {
             await categoryService.deleteCategory(categoryToDeleteId);
             toast.success(t('common:success'), { description: t('categories:deleteSuccess') });
             closeConfirmDialog();
             // Refetch and update all flat list
             fetchAllFlatCategories();
             if (categoriesResponse && categoriesResponse.data.length === 1 && currentPage > 1) { setSearchParams(prev => prev - 1); }
             else { fetchCategories(currentPage, debouncedSearchTerm); }
         } catch (err) { toast.error(t('common:error'), { description: categoryService.getErrorMessage(err) }); closeConfirmDialog(); }
         finally { setIsDeleting(false); }
     };

    return (
        <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
             <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl md:text-3xl font-semibold">{t('categories:manageTitle')}</h1> {/* Add key */}
                 {can('manage-categories') && ( <Button onClick={() => openModal()} disabled={loadingFlatCategories}><Plus className="me-2 h-4 w-4" /> {t('categories:addCategory')}</Button> )}
            </div>
            <div className="mb-4 max-w-sm flex items-center border rounded px-2">
                <Search className="h-4 w-4 text-muted-foreground mr-2" />
                <Input placeholder={t('categories:searchPlaceholder')} value={searchTerm} onChange={handleSearchChange} className="flex-1" />
            </div>

            {(isLoading || loadingFlatCategories) && (
                <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}
            {!isLoading && error && ( <Alert> {error} </Alert> )}

            {!isLoading && !error && categoriesResponse && (
                <>
                <Card className="dark:bg-gray-900">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-center">{t('categories:nameLabel')}</TableHead>
                                    <TableHead className="text-center">{t('categories:parentCategoryLabel')}</TableHead>
                                    <TableHead className="text-center">{t('products:productsCount')}</TableHead> {/* Add key */}
                                    <TableHead className="text-center">{t('common:actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {categoriesResponse.data.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                                            {t('categories:noResults')}
                                        </TableCell>
                                    </TableRow>
                                )}
                                {categoriesResponse.data.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium text-center">{category.name}</TableCell>
                                        <TableCell className="text-center">{allCategoriesFlat.find(c => c.id === category.parent_id)?.name || '---'}</TableCell>
                                        <TableCell className="text-center">{category.products_count ?? 0}</TableCell>
                                        <TableCell className="text-center">
                                             <div className="flex justify-center items-center gap-1">
                                                 {can('manage-categories') && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openModal(category)}><Edit className="h-4 w-4" /></Button>}
                                                 {can('manage-categories') && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => openConfirmDialog(category.id)} disabled={isDeleting}><Trash2 className="h-4 w-4" /></Button>}
                                             </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 {categoriesResponse.last_page > 1 && (
                     <div className="flex justify-center mt-4">
                         <Button
                             onClick={() => handlePageChange(currentPage - 1)}
                             disabled={currentPage === 1}
                         >
                             {t('common:previous')}
                         </Button>
                         <span className="mx-4">{`${t('common:page')} ${currentPage} ${t('common:of')} ${categoriesResponse.last_page}`}</span>
                         <Button
                             onClick={() => handlePageChange(currentPage + 1)}
                             disabled={currentPage === categoriesResponse.last_page}
                         >
                             {t('common:next')}
                         </Button>
                     </div>
                 )}
                </>
            )}
             <CategoryFormModal isOpen={isModalOpen} onClose={closeModal} categoryToEdit={editingCategory} onSaveSuccess={handleSaveSuccess} allCategories={allCategoriesFlat} loadingCategories={loadingFlatCategories}/>
             <ConfirmationDialog open={isConfirmOpen} onClose={closeConfirmDialog} onConfirm={handleDeleteConfirm} title={t('common:confirmDeleteTitle')} message={t('categories:deleteConfirm')} confirmText={t('common:delete')} cancelText={t('common:cancel')} isLoading={isDeleting} />
        </div>
    );
};
export default CategoriesListPage;