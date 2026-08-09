import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";

export interface Shift {
    id: number;
    name: string;
    shift_date?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    is_open?: boolean;
}

export function useShifts() {
    return useQuery<Shift[]>({
        queryKey: ["shifts"],
        queryFn: async () => {
            const response = await apiClient.get<{ data: Shift[] }>("/shifts");
            return response.data.data || [];
        },
        staleTime: 5 * 60 * 1000,
    });
}

export function useCurrentShift() {
    return useQuery<Shift | null>({
        queryKey: ["shifts", "current"],
        queryFn: async () => {
            try {
                const response = await apiClient.get<{ data: Shift } | Shift>("/shifts/current");
                const body = response.data as { data?: Shift } & Partial<Shift>;
                const shift = (body?.data ?? body) as Shift | null;
                if (!shift || typeof shift !== "object" || !("id" in shift)) return null;
                // The endpoint returns the most recently created shift regardless of status —
                // treat an explicitly closed shift the same as "no shift open".
                return shift.is_open === false ? null : shift;
            } catch {
                return null;
            }
        },
        staleTime: 60 * 1000, // 1 minute
    });
}
