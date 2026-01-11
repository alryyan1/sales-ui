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
  productId?: number | null;
  posMode?: "shift" | "days";
  limit?: number;
}

export function useSalesReport({
  page = 1,
  startDate,
  endDate,
  clientId,
  userId,
  shiftId,
  productId,
  posMode,
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
      productId,
      posMode,
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
        productId || undefined,
        limit,
        posMode
      ),
    placeholderData: keepPreviousData,
    refetchOnMount: true,
    staleTime: 0,
  });
}
