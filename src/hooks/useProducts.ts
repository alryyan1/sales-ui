import { useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import productService, {
  Product,
  ApiPaginatedResponse,
} from "../services/productService";

interface UseProductsParams {
  page?: number; // Kept for compatibility but ignored for infinite scroll key
  perPage?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  categoryId?: number | null;
  inStockOnly?: boolean;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  warehouseId?: number;
}

export function useProducts({
  page = 1,
  perPage = 50, // Increased default for infinite scroll
  search = "",
  sortBy = "created_at",
  sortDirection = "desc",
  categoryId,
  inStockOnly,
  lowStockOnly,
  outOfStockOnly,
  warehouseId,
}: UseProductsParams = {}) {
  return useInfiniteQuery<ApiPaginatedResponse<Product>>({
    queryKey: [
      "products",
      "infinite",
      perPage,
      search,
      sortBy,
      sortDirection,
      categoryId,
      inStockOnly,
      lowStockOnly,
      outOfStockOnly,
      warehouseId,
    ],
    queryFn: ({ pageParam }) =>
      productService.getProducts(
        pageParam as number,
        search,
        sortBy,
        sortDirection,
        perPage,
        categoryId,
        inStockOnly,
        lowStockOnly,
        outOfStockOnly,
        warehouseId,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Laravel pagination meta
      if (lastPage.meta.current_page < lastPage.meta.last_page) {
        return lastPage.meta.current_page + 1;
      }
      return undefined;
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
