import { useQuery } from "@tanstack/react-query";
import paymentService, { PaymentStatsParams } from "@/services/paymentService";

export function usePaymentStats(params: PaymentStatsParams, enabled = true) {
  return useQuery({
    queryKey: ["payment-stats", params],
    queryFn: () => paymentService.getStats(params),
    enabled,
    staleTime: 0,
    refetchOnMount: true,
  });
}
