// src/components/clients/ClientsTable.tsx
import React from "react";
import { useTranslation } from "react-i18next";

// MUI Components for Table
import Tooltip from "@mui/material/Tooltip"; // To show hints on icons
import Box from "@mui/material/Box";

// MUI Icons

// Import the Client type from clientService
import { Client } from "../../services/clientService"; // Adjust the path as needed
import { Edit, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { CardContent } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

// Define the props the component will receive
interface ClientsTableProps {
  clients: Client[]; // Array of clients to display
  onEdit: (client: Client | null) => void | undefined; // Function to call when edit button is clicked
  onDelete: (id: number) => void | undefined; // Function to call when delete button is clicked
  isLoading?: boolean; // Optional loading state for skeleton/indicator
  canEdit?: boolean; // <-- New prop
  canDelete?: boolean; //
}

const ClientsTable: React.FC<ClientsTableProps> = ({
  clients,
  onEdit,
  onDelete,
  isLoading = false,
  canEdit = false,
  canDelete = false,
}) => {
  const { t } = useTranslation(["clients", "common"]); // Load necessary namespaces

  // Handle case where there are no clients to display
  if (!isLoading && clients.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("clients:noClients")}
      </div>
    );
  }

  // Basic loading indicator (optional, can be handled in parent)
  // if (isLoading) {
  //     return <Typography>Loading clients...</Typography>; // Or a skeleton loader
  // }

  return (
    <Card>
      
      {/* Add elevation for visual separation */}
      <CardContent>
        <Table aria-label={t("clients:pageTitle")}>
          <TableHeader>
            
            {/* Header background color */}
            <TableRow>
              {/* Define table headers using translations */}
              <TableCell align="center">{t("clients:id")}</TableCell>
              <TableCell>{t("clients:name")}</TableCell>
              <TableCell align="center">{t("clients:email")}</TableCell>
              <TableCell align="center">{t("clients:phone")}</TableCell>
              <TableCell align="center">{t("clients:address")}</TableCell>
              <TableCell align="center">{t("common:actions")}</TableCell>
              {/* Actions column */}
            </TableRow>
          </TableHeader>
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
                    {/* Edit Button */}
                    {/* Conditionally render Edit button */}
                    {canEdit && (
                      <Tooltip title={t("common:edit") || ""}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(client)}
                          disabled={isLoading}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    )}
                    {/* Conditionally render Delete button */}
                    {canDelete && (
                      <Tooltip title={t("common:delete") || ""}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-600 hover:text-red-700"
                          onClick={() => onDelete(client.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
