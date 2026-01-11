import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

interface ExpensesSummary {
  total_expenses: number;
  total_refunds: number;
}

interface UseExpensesSummaryParams {
  startDate?: string | null;
  endDate?: string | null;
  userId?: number | null;
}

export function useExpensesSummary({
  startDate,
  endDate,
  userId,
}: UseExpensesSummaryParams) {
  return useQuery<ExpensesSummary>({
    queryKey: ["expenses-summary", startDate, endDate, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
      if (userId) params.append("user_id", userId.toString());

      const response = await apiClient.get<ExpensesSummary>(
        `/reports/expenses-summary?${params.toString()}`
      );
      return response.data;
    },
    staleTime: 60 * 1000,
  });
}
