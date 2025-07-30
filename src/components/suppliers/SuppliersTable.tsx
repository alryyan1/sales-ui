// src/components/suppliers/SuppliersTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components
import TableContainer from "@mui/material/TableContainer";
import Typography from "@mui/material/Typography"; // For empty state message

// MUI Icons
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

// Import Supplier type
import { Supplier } from "../../services/supplierService"; // Adjust path
import { Card, CardContent } from "../ui/card";
// import { Box, CardContent, IconButton, Paper, Tooltip } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useAuthorization } from "@/hooks/useAuthorization";
import { Box, IconButton, Paper, Tooltip } from "@mui/material";

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
  const { t } = useTranslation(["suppliers", "common"]); // Load namespaces
  const { can, isAdmin } = useAuthorization();
  if (suppliers.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: "center", mt: 2 }}>
        <Typography variant="body1">{t("suppliers:noSuppliers")}</Typography>{" "}
        {/* Add noSuppliers key */}
      </Paper>
    );
  }

  return (
    <Card>
      {/* Use subtle elevation */}
      <CardContent>
        <Table aria-label={t("suppliers:pageTitle")}>
          {/* Add pageTitle key */}
          <TableHeader>
            <TableRow>
              <TableHead className="text-center" align="center">
                {t("suppliers:name")}
              </TableHead>
              <TableHead className="text-center">
                {t("suppliers:contactPerson")}
              </TableHead>
              <TableHead className="text-center">
                {t("suppliers:email")}
              </TableHead>
              <TableHead className="text-center">
                {t("suppliers:phone")}
              </TableHead>
              <TableHead className="text-center">
                {t("common:actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
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
                    {/* View Ledger Button */}
                    <Tooltip title={t("suppliers:viewLedger") || ""}>
                      <IconButton
                        aria-label={t("suppliers:viewLedger") || "View Ledger"}
                        color="info"
                        size="small"
                        onClick={() => onViewLedger(supplier)}
                        disabled={isLoading}
                      >
                        <AccountBalanceIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {/* Edit Button */}
                    {can("edit-suppliers") && (
                      <Tooltip title={t("common:edit") || ""}>
                        <span>
                          {/* Span needed for tooltip when button is disabled */}
                          <IconButton
                            aria-label={t("common:edit") || "Edit"}
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
                    
                    {/* Delete Button */}
                    {can("delete-suppliers") && (
                      <Tooltip title={t("common:delete") || ""}>
                        <span>
                          <IconButton
                            aria-label={t("common:delete") || "Delete"}
                            color="error"
                            size="small"
                            onClick={() => onDelete(supplier.id)}
                            disabled={isLoading}
                          >
                            <DeleteIcon fontSize="small" />
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
