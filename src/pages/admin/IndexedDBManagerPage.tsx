import React, { useState, useEffect } from "react";
import { Button, IconButton, Alert, LinearProgress } from "@mui/material";
import {
  RefreshCw,
  AlertTriangle,
  Delete,
  Database,
  ShoppingCart,
  Package,
  ArrowUpDown,
} from "lucide-react";
import { dbService, STORES, OfflineSale } from "../../services/db";

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate, formatCurrency } from "@/constants";

const IndexedDBManagerPage = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [products, setProducts] = useState<any[]>([]);
  const [pendingSales, setPendingSales] = useState<OfflineSale[]>([]);
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh Data
  const loadData = async () => {
    setLoading(true);
    try {
      // Products
      const productData = await dbService.getAllFromStore(STORES.PRODUCTS);
      setProducts(productData.slice(0, 50)); // Limit display

      // Pending Sales
      const sales = await dbService.getPendingSales();
      setPendingSales(sales);

      // Sync Queue
      const queue = await dbService.getAllFromStore(STORES.SYNC_QUEUE);
      setSyncQueue(queue);

      setError(null);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load data from IndexedDB");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleClearStore = async (storeName: string) => {
    try {
      await dbService.clearStore(storeName);
      loadData();
    } catch (err) {
      setError(`Failed to clear ${storeName}`);
    }
  };

  const handleDeletePendingSale = async (tempId: string) => {
    if (!confirm("Delete this pending sale?")) return;
    await dbService.deletePendingSale(tempId);
    loadData();
  };

  const handleDeleteSyncAction = async (id: number) => {
    if (!confirm("Delete this sync action?")) return;
    await dbService.removeSyncAction(id);
    loadData();
  };

  // Stats
  const stats = [
    {
      title: "Pending Sales",
      value: pendingSales.length,
      icon: ShoppingCart,
      description: "Sales waiting to sync",
      color: "text-blue-500",
    },
    {
      title: "Sync Queue",
      value: syncQueue.length,
      icon: ArrowUpDown,
      description: "Actions in queue",
      color: "text-orange-500",
    },
    {
      title: "Cached Products",
      value: products.length > 0 ? "50+" : 0,
      icon: Package,
      description: "Offline product cache",
      color: "text-green-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Local Database Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your offline data, pending sales, and sync queue directly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="contained"
            onClick={loadData}
            startIcon={<RefreshCw className={loading ? "animate-spin" : ""} />}
            disabled={loading}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Error & Loading */}
      {loading && <LinearProgress className="w-full rounded-full h-1" />}
      {error && (
        <Alert severity="error" icon={<AlertTriangle className="h-4 w-4" />}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs
        defaultValue="pending"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="pending">Pending Sales</TabsTrigger>
          <TabsTrigger value="sync">Sync Queue</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* TAB: PENDING SALES */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pending Sales</CardTitle>
                <CardDescription>
                  Sales created offline waiting to be synchronized.
                </CardDescription>
              </div>
              <ClearStoreDialog
                storeName="Pending Sales"
                onConfirm={() => handleClearStore(STORES.PENDING_SALES)}
              />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Temp ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSales.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No pending sales found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingSales.map((sale) => (
                        <TableRow key={sale.tempId}>
                          <TableCell className="font-mono text-xs">
                            {sale.tempId}
                          </TableCell>
                          <TableCell>
                            {formatDate(sale.offline_created_at)}
                          </TableCell>
                          <TableCell>{sale.items.length}</TableCell>
                          <TableCell className="font-semibold">
                            {formatCurrency(Number(sale.total_amount))}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={sale.is_synced ? "default" : "secondary"}
                            >
                              {sale.is_synced ? "Synced" : "Pending"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleDeletePendingSale(sale.tempId)
                              }
                            >
                              <Delete size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SYNC QUEUE */}
        <TabsContent value="sync" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sync Queue</CardTitle>
                <CardDescription>
                  Ordered actions waiting to be processed by the server.
                </CardDescription>
              </div>
              <ClearStoreDialog
                storeName="Sync Queue"
                onConfirm={() => handleClearStore(STORES.SYNC_QUEUE)}
              />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Payload Preview</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncQueue.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-24 text-center text-muted-foreground"
                        >
                          Sync queue is empty.
                        </TableCell>
                      </TableRow>
                    ) : (
                      syncQueue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.id}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.type}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(item.created_at)}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-xs font-mono text-muted-foreground">
                            {JSON.stringify(item.payload)}
                          </TableCell>
                          <TableCell className="text-right">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteSyncAction(item.id)}
                            >
                              <Delete size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: PRODUCTS */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cached Products</CardTitle>
                <CardDescription>
                  Offline product catalog cache (First 50 shown).
                </CardDescription>
              </div>
              <ClearStoreDialog
                storeName="Product Cache"
                onConfirm={() => handleClearStore(STORES.PRODUCTS)}
              />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center text-muted-foreground"
                        >
                          No products cached.
                        </TableCell>
                      </TableRow>
                    ) : (
                      products.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{p.id}</TableCell>
                          <TableCell className="font-medium">
                            {p.name}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.sku}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              Number(
                                p.suggested_sale_price ||
                                  p.last_sale_price_per_sellable_unit ||
                                  0
                              )
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Helper Dialog Component
const ClearStoreDialog = ({
  storeName,
  onConfirm,
}: {
  storeName: string;
  onConfirm: () => void;
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        variant="outlined"
        color="error"
        size="small"
        startIcon={<Delete />}
      >
        Clear {storeName}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete all data in
          the
          <span className="font-bold"> {storeName}</span> store from your local
          browser database.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-red-600 hover:bg-red-700"
        >
          Delete Data
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default IndexedDBManagerPage;
