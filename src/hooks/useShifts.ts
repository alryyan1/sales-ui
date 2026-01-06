import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/axios";

export interface Shift {
    id: number;
    name: string;
    shift_date?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
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
                const response = await apiClient.get<Shift>("/shifts/current");
                return response.data;
            } catch {
                return null;
            }
        },
        staleTime: 60 * 1000, // 1 minute
    });
}
