import { useQuery, keepPreviousData } from "@tanstack/react-query";
import paymentService, { PaymentQueryParams } from "@/services/paymentService";

export function usePayments(params: PaymentQueryParams, enabled = true) {
  return useQuery({
    queryKey: ["payments", params],
    queryFn: () => paymentService.getPayments(params),
    enabled,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: true,
  });
}
