import { useQuery, keepPreviousData } from "@tanstack/react-query";
import saleService, { Sale } from "../services/saleService";
import { PaginatedResponse } from "../services/clientService";

interface UseSalesReportParams {
    page?: number;
    startDate?: string | null;
    endDate?: string | null;
    clientId?: number | null;
    userId?: number | null;
    shiftId?: number | null;
    limit?: number;
}

export function useSalesReport({
    page = 1,
    startDate,
    endDate,
    clientId,
    userId,
    shiftId,
    limit = 25,
}: UseSalesReportParams) {
    return useQuery<PaginatedResponse<Sale>>({
        queryKey: [
            "sales-report",
            page,
            startDate,
            endDate,
            clientId,
            userId,
            shiftId,
            limit,
        ],
        queryFn: () =>
            saleService.getSalesReport(
                page,
                startDate || undefined,
                endDate || undefined,
                clientId,
                userId,
                shiftId,
                limit
            ),
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000, // 1 minute
    });
}
