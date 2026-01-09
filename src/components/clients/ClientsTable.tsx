// src/components/clients/ClientsTable.tsx
import React from "react";

// MUI Components
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

// Types
import { Client } from "../../services/clientService";

// Define the props the component will receive
interface ClientsTableProps {
  clients: Client[]; // Array of clients to display
  onClientClick?: (client: Client) => void; // Prop for row click
  isLoading?: boolean; // Optional loading state for skeleton/indicator
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onClientClick,
  isLoading = false,
}) => {
  // Handle case where there are no clients to display
  if (!isLoading && clients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">لا يوجد عملاء حاليًا</div>
    );
  }

  return (
    <Card style={{ direction: "rtl" }}>
      <CardContent>
        <Table aria-label="جدول العملاء">
          <TableHead>
            <TableRow>
              <TableCell align="center">#</TableCell>
              <TableCell>الاسم</TableCell>
              {/* <TableCell align="center">البريد الإلكتروني</TableCell> */}
              <TableCell align="center">رقم الهاتف</TableCell>
              {/* <TableCell align="center">العنوان</TableCell> */}
              <TableCell align="center">إجمالي المديونية</TableCell>
              <TableCell align="center">إجمالي المدفوعات</TableCell>
              <TableCell align="center">الرصيد</TableCell>
              {/* Removed Actions Header */}
            </TableRow>
          </TableHead>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                onClick={() => onClientClick && onClientClick(client)}
                sx={{
                  cursor: onClientClick ? "pointer" : "default",
                  "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
                }}
              >
                {/* Client Data Cells */}
                <TableCell align="center">{client.id || "---"}</TableCell>
                <TableCell>{client.name}</TableCell>
                {/* <TableCell align="center">{client.email || "---"}</TableCell> */}
                <TableCell align="center">{client.phone || "---"}</TableCell>
                {/* <TableCell align="center">{client.address || "---"}</TableCell> */}

                {/* Financial Summary */}
                <TableCell align="center" dir="ltr">
                  {(client.total_debit || 0).toLocaleString()}
                </TableCell>
                <TableCell align="center" dir="ltr">
                  {(client.total_credit || 0).toLocaleString()}
                </TableCell>
                <TableCell
                  align="center"
                  dir="ltr"
                  sx={{
                    color:
                      (client.balance || 0) > 0 ? "error.main" : "success.main",
                    fontWeight: "bold",
                  }}
                >
                  {(client.balance || 0).toLocaleString()}
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
