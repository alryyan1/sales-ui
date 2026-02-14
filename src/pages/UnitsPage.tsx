import React, { useState } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Tooltip,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Edit, Trash2, Plus, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import unitService, { Unit } from "../services/UnitService";
import UnitFormModal from "../components/units/UnitFormModal";

const UnitsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "stocking" | "sellable">(
    "all",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Fetch units
  const { data, isLoading, error } = useQuery({
    queryKey: ["units", search, typeFilter],
    queryFn: async () => {
      const result = await unitService.getUnits(1, 100, search, true);
      let units = result.data;

      // Filter by type if needed
      if (typeFilter !== "all") {
        units = units.filter((u) => u.type === typeFilter);
      }

      return units;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => unitService.deleteUnit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });

  const handleEdit = (unit: Unit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const handleDelete = async (unit: Unit) => {
    if (window.confirm(`Are you sure you want to delete "${unit.name}"?`)) {
      try {
        await deleteMutation.mutateAsync(unit.id);
      } catch (error: any) {
        alert(error.message || "Failed to delete unit");
      }
    }
  };

  const handleAddNew = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUnit(null);
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["units"] });
    handleCloseModal();
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" fontWeight="bold">
          Units Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={20} />}
          onClick={handleAddNew}
        >
          Add Unit
        </Button>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              label="Type"
              onChange={(e) => setTypeFilter(e.target.value as any)}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="stocking">Stocking</MenuItem>
              <MenuItem value="sellable">Sellable</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Failed to load units</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Default</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data && data.length > 0 ? (
                data.map((unit) => (
                  <TableRow key={unit.id} hover>
                    <TableCell>
                      <Typography
                        fontWeight={unit.is_default ? "bold" : "normal"}
                      >
                        {unit.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={unit.type}
                        size="small"
                        color={
                          unit.type === "stocking" ? "primary" : "secondary"
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {unit.description || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {unit.is_default && (
                        <Tooltip title="Default unit">
                          <Star size={18} fill="gold" color="gold" />
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={unit.is_active ? "Active" : "Inactive"}
                        size="small"
                        color={unit.is_active ? "success" : "default"}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="center"
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(unit)}
                          >
                            <Edit size={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(unit)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" py={4}>
                      No units found
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Modal */}
      <UnitFormModal
        open={isModalOpen}
        onClose={handleCloseModal}
        unit={editingUnit}
        onSuccess={handleSuccess}
      />
    </Box>
  );
};

export default UnitsPage;
