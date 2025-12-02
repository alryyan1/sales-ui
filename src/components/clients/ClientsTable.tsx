// src/components/clients/ClientsTable.tsx
import React from "react";

// MUI Components
import {
  Box,
  Tooltip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";

// Icons
import { Edit, Trash2, FileText } from "lucide-react";

// Types
import { Client } from "../../services/clientService";

// Define the props the component will receive
interface ClientsTableProps {
  clients: Client[]; // Array of clients to display
  onEdit: (client: Client | null) => void | undefined; // Function to call when edit button is clicked
  onDelete: (id: number) => void | undefined; // Function to call when delete button is clicked
  isLoading?: boolean; // Optional loading state for skeleton/indicator
  canEdit?: boolean; // <-- New prop
  canDelete?: boolean; //
  onViewLedger?: (id: number) => void; // Optional: view ledger action
  canViewLedger?: boolean; // Optional: control visibility
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onEdit,
  onDelete,
  isLoading = false,
  canEdit = false,
  canDelete = false,
  onViewLedger,
  canViewLedger = true,
}) => {
  // Handle case where there are no clients to display
  if (!isLoading && clients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        لا يوجد عملاء حاليًا
      </div>
    );
  }

  // Basic loading indicator (optional, can be handled in parent)
  // if (isLoading) {
  //     return <Typography>Loading clients...</Typography>; // Or a skeleton loader
  // }

  return (
    <Card style={{direction: 'rtl'}}>
      <CardContent>
        <Table aria-label="جدول العملاء">
          <TableHead>
            <TableRow>
              <TableCell align="center">#</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell align="center">البريد الإلكتروني</TableCell>
              <TableCell align="center">رقم الهاتف</TableCell>
              <TableCell align="center">العنوان</TableCell>
              <TableCell align="center">الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                // Styling for rows
              >
                {/* Client Data Cells */}
                <TableCell align="center">{client.id || "---"}</TableCell>
                {/* Handle null values */}
                <TableCell>{client.name}</TableCell>
                <TableCell align="center">
                  {client.email || "---"}
                </TableCell>
                {/* Handle null values */}
                <TableCell align="center">{client.phone || "---"}</TableCell>
                <TableCell align="center">{client.address || "---"}</TableCell>
                {/* Actions Cell */}
                <TableCell align="center">
                  <Box
                    sx={{ display: "flex", justifyContent: "center", gap: 1 }}
                  >
                    {onViewLedger && canViewLedger && (
                      <Tooltip title="كشف حساب">
                        <IconButton
                          size="small"
                          onClick={() => onViewLedger(client.id)}
                          disabled={isLoading}
                        >
                          <FileText className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canEdit && (
                      <Tooltip title="تعديل">
                        <IconButton
                          size="small"
                          onClick={() => onEdit(client)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {canDelete && (
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          sx={{ color: "error.main" }}
                          onClick={() => onDelete(client.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
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

export default ClientsTable;
