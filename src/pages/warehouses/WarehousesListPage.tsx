import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Box,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { Warehouse, warehouseService } from "../../services/warehouseService";
import WarehouseFormDialog from "./WarehouseFormDialog";

const WarehousesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(
    null
  );

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const data = await warehouseService.getAll();
      setWarehouses(data);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleAdd = () => {
    setSelectedWarehouse(null);
    setDialogOpen(true);
  };

  const handleEdit = (warehouse: Warehouse) => {
    setSelectedWarehouse(warehouse);
    setDialogOpen(true);
  };

  const handleSave = async (data: Partial<Warehouse>) => {
    if (selectedWarehouse) {
      await warehouseService.update(selectedWarehouse.id, data);
    } else {
      await warehouseService.create(data);
    }
    fetchWarehouses();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("هل أنت متأكد من حذف هذا المستودع؟")) {
      try {
        await warehouseService.delete(id);
        fetchWarehouses();
      } catch (error) {
        console.error("Error deleting warehouse:", error);
        alert(
          "فشل حذف المستودع. قد يكون مرتبطاً بسجلات موجودة."
        );
      }
    }
  };

  const handleViewProducts = (warehouseId: number) => {
    navigate(`/warehouses/${warehouseId}/products`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography
          variant="h4"
          component="h1"
          display="flex"
          alignItems="center"
          gap={1}
        >
          <StoreIcon fontSize="large" color="primary" />
          المستودعات
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          إضافة مستودع
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>
                <strong>المعرف</strong>
              </TableCell>
              <TableCell>
                <strong>الاسم</strong>
              </TableCell>
              <TableCell>
                <strong>العنوان</strong>
              </TableCell>
              <TableCell>
                <strong>معلومات الاتصال</strong>
              </TableCell>
              <TableCell>
                <strong>الحالة</strong>
              </TableCell>
              <TableCell align="right">
                <strong>الإجراءات</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  لا توجد مستودعات.
                </TableCell>
              </TableRow>
            ) : (
              warehouses.map((warehouse) => (
                <TableRow key={warehouse.id} hover>
                  <TableCell>{warehouse.id}</TableCell>
                  <TableCell>{warehouse.name}</TableCell>
                  <TableCell>{warehouse.address || "-"}</TableCell>
                  <TableCell>{warehouse.contact_info || "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={warehouse.is_active ? "نشط" : "غير نشط"}
                      color={warehouse.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleViewProducts(warehouse.id)}
                      title="عرض المنتجات"
                    >
                      <InventoryIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleEdit(warehouse)}
                      title="تعديل"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleDelete(warehouse.id)}
                      disabled={warehouse.id === 1} // Prevent deleting Main Warehouse (ID 1)
                      title="حذف"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <WarehouseFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initialData={selectedWarehouse}
      />
    </Container>
  );
};

export default WarehousesListPage;
