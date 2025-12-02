// src/components/suppliers/SuppliersTable.tsx
import React from "react";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";

// MUI Icons
import EditIcon from "@mui/icons-material/Edit";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

// Types & hooks
import { Supplier } from "../../services/supplierService";
import { useAuthorization } from "@/hooks/useAuthorization";

// Component Props
interface SuppliersTableProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (id: number) => void;
  onViewLedger: (supplier: Supplier) => void;
  isLoading?: boolean; // For potential row disabling during delete
}

const SuppliersTable: React.FC<SuppliersTableProps> = ({
  suppliers,
  onEdit,
  onDelete,
  onViewLedger,
  isLoading = false,
}) => {
  const { can } = useAuthorization();
  if (suppliers.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center", mt: 2 }}>
        <Typography variant="body1">لا يوجد موردون حاليًا</Typography>
      </Paper>
    );
  }

  return (
    <Card>
      <CardContent>
        <Table aria-label="جدول الموردين">
          <TableHead>
            <TableRow>
              <TableCell align="center">الاسم</TableCell>
              <TableCell align="center">مسؤول التواصل</TableCell>
              <TableCell align="center">البريد الإلكتروني</TableCell>
              <TableCell align="center">رقم الهاتف</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell align="center" scope="row">
                  {supplier.name}
                </TableCell>
                <TableCell align="center">
                  {supplier.contact_person || "---"}
                </TableCell>
                <TableCell align="center">{supplier.email || "---"}</TableCell>
                <TableCell align="center">{supplier.phone || "---"}</TableCell>
                <TableCell align="center">
                  <Box
                    sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}
                  >
                    <Tooltip title="كشف حساب المورد">
                      <IconButton
                        aria-label="كشف حساب المورد"
                        color="info"
                        size="small"
                        onClick={() => onViewLedger(supplier)}
                        disabled={isLoading}
                      >
                        <AccountBalanceIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    {can("edit-suppliers") && (
                      <Tooltip title="تعديل">
                        <span>
                          <IconButton
                            aria-label="تعديل"
                            color="primary"
                            size="small"
                            onClick={() => onEdit(supplier)}
                            disabled={isLoading} // Disable if parent is processing delete
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SuppliersTable;
