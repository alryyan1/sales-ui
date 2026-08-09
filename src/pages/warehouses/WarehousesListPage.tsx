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
  Switch,
  Tooltip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Warehouse, warehouseService } from "../../services/warehouseService";
import WarehouseFormDialog from "./WarehouseFormDialog";

const WarehousesListPage: React.FC = () => {
  const { t } = useTranslation(["warehouses"]);
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
      const data = await warehouseService.getAll(true);
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

  const handleToggleActive = async (warehouse: Warehouse) => {
    try {
      await warehouseService.toggleActive(warehouse.id, !warehouse.is_active);
      fetchWarehouses();
    } catch (error) {
      console.error("Error toggling warehouse status:", error);
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
          {t("warehouses:listPage.title")}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          {t("warehouses:listPage.addWarehouse")}
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell>
                <strong>{t("warehouses:listPage.columnId")}</strong>
              </TableCell>
              <TableCell>
                <strong>{t("warehouses:listPage.columnName")}</strong>
              </TableCell>
              <TableCell>
                <strong>{t("warehouses:listPage.columnAddress")}</strong>
              </TableCell>
              <TableCell>
                <strong>{t("warehouses:listPage.columnContactInfo")}</strong>
              </TableCell>
              <TableCell>
                <strong>{t("warehouses:listPage.columnStatus")}</strong>
              </TableCell>
              <TableCell align="right">
                <strong>{t("warehouses:listPage.columnActions")}</strong>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t("warehouses:listPage.loadingEllipsis")}
                </TableCell>
              </TableRow>
            ) : warehouses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t("warehouses:listPage.noWarehouses")}
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
                      label={warehouse.is_active ? t("warehouses:listPage.active") : t("warehouses:listPage.inactive")}
                      color={warehouse.is_active ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleViewProducts(warehouse.id)}
                      title={t("warehouses:listPage.viewProducts")}
                    >
                      <InventoryIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      size="small"
                      onClick={() => handleEdit(warehouse)}
                      title={t("warehouses:listPage.edit")}
                    >
                      <EditIcon />
                    </IconButton>
                    <Tooltip title={warehouse.is_active ? t("warehouses:listPage.disableWarehouse") : t("warehouses:listPage.enableWarehouse")}>
                      <Switch
                        size="small"
                        checked={warehouse.is_active}
                        onChange={() => handleToggleActive(warehouse)}
                        disabled={warehouse.id === 1}
                      />
                    </Tooltip>
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
