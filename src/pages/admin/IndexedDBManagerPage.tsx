import { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    Tab,
    Container,
    IconButton,
    Alert,
    LinearProgress,
} from '@mui/material';
import { Refresh, Delete, DeleteSweep } from '@mui/icons-material';
import { dbService, STORES, OfflineSale } from '../../services/db';

const IndexedDBManagerPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [products, setProducts] = useState<any[]>([]);
    const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
    const [syncQueue, setSyncQueue] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Products
            const productData = await dbService.getAllFromStore(STORES.PRODUCTS);
            setProducts(productData.slice(0, 50));

            // Pending Sales
            const sales = await dbService.getPendingSales();
            setPendingSales(sales);

            // Sync Queue
            // We want ALL queue items including processed for debug, usually getPendingSyncActions filters them.
            // Let's us raw store access here to see everything
            const queue = await dbService.getAllFromStore(STORES.SYNC_QUEUE);
            setSyncQueue(queue);
            
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError('Failed to load data from IndexedDB');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleClearStore = async (storeName: string) => {
        if (!confirm(`Are you sure you want to clear ${storeName}? This cannot be undone.`)) return;
        try {
            await dbService.clearStore(storeName);
            loadData();
        } catch (err) {
            setError(`Failed to clear ${storeName}`);
        }
    };
    
    const handleDeletePendingSale = async (tempId: string) => {
        if (!confirm('Delete this pending sale?')) return;
        await dbService.deletePendingSale(tempId);
        loadData();
    };
    
    const handleDeleteSyncAction = async (id: number) => {
        if (!confirm('Delete this sync action?')) return;
        await dbService.removeSyncAction(id);
        loadData();
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">IndexedDB Manager</Typography>
                <Button variant="contained" startIcon={<Refresh />} onClick={loadData}>
                    Refresh Data
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Paper sx={{ width: '100%', mb: 2 }}>
                <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label={`Pending Sales (${pendingSales.length})`} />
                    <Tab label={`Sync Queue (${syncQueue.length})`} />
                    <Tab label={`Products (Cached: ${products.length > 0 ? '50+' : 0})`} />
                </Tabs>

                {/* TAB 0: PENDING SALES */}
                {activeTab === 0 && (
                    <Box sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button color="error" startIcon={<DeleteSweep />} onClick={() => handleClearStore(STORES.PENDING_SALES)}>
                                Clear All Pending Sales
                            </Button>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Temp ID</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Items</TableCell>
                                        <TableCell>Total</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Synced</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {pendingSales.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} align="center">No pending sales</TableCell></TableRow>
                                    ) : pendingSales.map((sale) => (
                                        <TableRow key={sale.tempId}>
                                            <TableCell>{sale.tempId}</TableCell>
                                            <TableCell>{new Date(sale.offline_created_at).toLocaleString()}</TableCell>
                                            <TableCell>{sale.items.length}</TableCell>
                                            <TableCell>{sale.total_amount}</TableCell>
                                            <TableCell>{sale.status}</TableCell>
                                            <TableCell>{sale.is_synced ? 'Yes' : 'No'}</TableCell>
                                            <TableCell>
                                                <IconButton size="small" color="error" onClick={() => handleDeletePendingSale(sale.tempId)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 1: SYNC QUEUE */}
                {activeTab === 1 && (
                    <Box sx={{ p: 2 }}>
                         <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button color="error" startIcon={<DeleteSweep />} onClick={() => handleClearStore(STORES.SYNC_QUEUE)}>
                                Clear Sync Queue
                            </Button>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Created At</TableCell>
                                        <TableCell>Payload Preview</TableCell>
                                        <TableCell>Action</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {syncQueue.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} align="center">Queue is empty</TableCell></TableRow>
                                    ) : syncQueue.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>{item.id}</TableCell>
                                            <TableCell>{item.type}</TableCell>
                                            <TableCell>{new Date(item.created_at).toLocaleString()}</TableCell>
                                            <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {JSON.stringify(item.payload)}
                                            </TableCell>
                                             <TableCell>
                                                <IconButton size="small" color="error" onClick={() => handleDeleteSyncAction(item.id)}>
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* TAB 2: PRODUCTS */}
                {activeTab === 2 && (
                    <Box sx={{ p: 2 }}>
                         <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                            <Button color="error" startIcon={<DeleteSweep />} onClick={() => handleClearStore(STORES.PRODUCTS)}>
                                Clear Product Cache
                            </Button>
                        </Box>
                        <Typography variant="caption" sx={{ mb: 2, display: 'block' }}>
                            Showing first 50 cached products.
                        </Typography>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>ID</TableCell>
                                        <TableCell>Name</TableCell>
                                        <TableCell>SKU</TableCell>
                                        <TableCell>Price</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {products.length === 0 ? (
                                        <TableRow><TableCell colSpan={4} align="center">No products cached</TableCell></TableRow>
                                    ) : products.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{p.id}</TableCell>
                                            <TableCell>{p.name}</TableCell>
                                            <TableCell>{p.sku}</TableCell>
                                            <TableCell>{p.suggested_sale_price || p.last_sale_price_per_sellable_unit}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default IndexedDBManagerPage;
