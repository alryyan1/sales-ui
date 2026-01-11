import { useQuery } from "@tanstack/react-query";
import expenseService from "../services/expenseService";

interface UseMonthlyExpensesParams {
  year: number;
  month: number;
}

export function useMonthlyExpenses({ year, month }: UseMonthlyExpensesParams) {
  return useQuery({
    queryKey: ["monthly-expenses", year, month],
    queryFn: () => expenseService.getMonthlyExpenses(year, month),
  });
}

