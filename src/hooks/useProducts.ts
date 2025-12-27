import { useQuery, keepPreviousData } from "@tanstack/react-query";
import productService, {
  Product,
  ApiPaginatedResponse,
} from "../services/productService";

interface UseProductsParams {
  page?: number;
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
  perPage = 15,
  search = "",
  sortBy = "created_at",
  sortDirection = "desc",
  categoryId,
  inStockOnly,
  lowStockOnly,
  outOfStockOnly,
  warehouseId,
}: UseProductsParams = {}) {
  return useQuery<ApiPaginatedResponse<Product>>({
    queryKey: [
      "products",
      page,
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
    queryFn: () =>
      productService.getProducts(
        page,
        search,
        sortBy,
        sortDirection,
        perPage,
        categoryId,
        inStockOnly,
        lowStockOnly,
        outOfStockOnly,
        warehouseId
      ),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000, // 1 minute stale time
  });
}
