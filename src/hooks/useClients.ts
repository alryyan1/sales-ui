import { useQuery } from "@tanstack/react-query";
import clientService, { Client, PaginatedResponse } from "../services/clientService";

export function useClients() {
    return useQuery<PaginatedResponse<Client>>({
        queryKey: ["clients", "all"],
        queryFn: () => clientService.getClients(1), // Fetch first page/all
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
