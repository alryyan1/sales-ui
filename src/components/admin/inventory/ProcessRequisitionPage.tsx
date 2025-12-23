// src/pages/admin/inventory/ProcessRequisitionPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form"; // Import FormProvider
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

// Import Child Components (ensure paths are correct)
import { RequisitionHeaderDisplay } from "../../../components/inventory/requisitions/RequisitionHeaderDisplay";
import { RequisitionItemsProcessingList } from "../../../components/inventory/requisitions/RequisitionItemsProcessingList";
import { RequisitionOverallStatusForm } from "../../../components/inventory/requisitions/RequisitionOverallStatusForm";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // For overall page structure if needed
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, ArrowLeft, AlertCircle } from "lucide-react";

// Services and Types
import stockRequisitionService, {
  StockRequisition,
  ProcessRequisitionData,
  StockRequisitionItem as ApiStockRequisitionItem,
} from "../../../services/stockRequisitionService";
import productService, { Product } from "../../../services/productService"; // Needed if passing product data down
import { PurchaseItem } from "../../../services/purchaseService"; // Needed for batch types if passed down

// --- Zod Schema Definition (Should match backend expectations and form structure) ---
// This schema is now more focused on the processing aspect if child components handle their own RHF fields.
// However, for a single form submission, the parent page's RHF needs the full schema.

// --- Component ---
const ProcessRequisitionPage: React.FC = () => {
  const navigate = useNavigate();
  const { requisitionId } = useParams<{ requisitionId: string }>(); // Get ID from URL

  const processRequisitionItemSchema = z
    .object({
        id: z.number(), // StockRequisitionItem ID (original)
        product_id: z.number(),
        product_name_display: z.string().optional(), // Populated for display
        requested_quantity: z.number(), // Readonly
        issued_quantity: z.coerce
            .number()
            .int()
            .min(0, { message: "يجب أن تكون القيمة أكبر من أو تساوي صفر" })
            .optional()
            .default(0),
        issued_from_purchase_item_id: z.number().positive().nullable().optional(),
        selected_batch_info: z.string().nullable().optional(),
        available_batch_stock: z.number().optional(),
        status: z
            .enum(["pending", "issued", "rejected_item"])
            .optional()
            .default("pending"),
        item_notes: z.string().nullable().optional(),
    })
    .refine((data) => data.issued_quantity <= data.requested_quantity, {
        message: "الكمية المصدرة تتجاوز الكمية المطلوبة",
        path: ["issued_quantity"],
    })
    .refine(
        (data) =>
            !data.issued_from_purchase_item_id ||
            data.issued_quantity <= (data.available_batch_stock ?? 0),
        {
            message: "الكمية المصدرة تتجاوز المخزون المتاح في الدفعة",
            path: ["issued_quantity"],
        }
    )
    .refine(
        (data) =>
            data.issued_quantity > 0
                ? data.issued_from_purchase_item_id !== null &&
                    data.issued_from_purchase_item_id !== undefined
                : true,
        {
            message: "يجب اختيار الدفعة عند إصدار الكمية",
            path: ["issued_from_purchase_item_id"],
        }
    );

  const processRequisitionSchema = z
    .object({
        status: z.enum(
            ["approved", "rejected", "partially_issued", "issued", "cancelled", "pending_approval"],
            { required_error: "هذا الحقل مطلوب" }
        ),
        issue_date: z.date().nullable().optional(),
        notes: z.string().nullable().optional(), // Overall manager notes
        items: z.array(processRequisitionItemSchema), // Array of items being processed
    })
    .refine(
        (data) =>
            data.status === "issued" || data.status === "partially_issued"
                ? !!data.issue_date
                : true,
        {
            message: "تاريخ الإصدار مطلوب",
            path: ["issue_date"],
        }
    );

type ProcessRequisitionFormValues = z.infer<typeof processRequisitionSchema>;

  // --- State ---
  const [requisition, setRequisition] = useState<StockRequisition | null>(null); // Original fetched requisition
  const [isLoading, setIsLoading] = useState(true); // For initial requisition load
  const [serverError, setServerError] = useState<string | null>(null); // For API submission errors

  // Product search state for items list (if passing down)
  // const [productsForSearch, setProductsForSearch] = useState<Product[]>([]);
  // const [loadingProductsSearch, setLoadingProductsSearch] = useState(false);
  // const [productSearchInput, setProductSearchInput] = useState('');
  // const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  // const productDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- React Hook Form Setup ---
  const formMethods = useForm<ProcessRequisitionFormValues>({
    resolver: zodResolver(processRequisitionSchema),
    defaultValues: {
      status: "pending_approval", // Should be derived from fetched requisition
      issue_date: null,
      notes: "",
      items: [], // Will be populated from fetched requisition
    },
  });
  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
    setError,
    control /* pass if needed */,
  } = formMethods;

  // --- Fetch Requisition Details & Populate Form ---
  const fetchRequisitionDetails = useCallback(
    async (id: number) => {
      setIsLoading(true);
      setServerError(null);
      try {
        const data = await stockRequisitionService.getRequisition(id);
        setRequisition(data); // Store the original fetched data
        console.log("Fetched requisition data:", data);
        // Populate RHF form state based on the fetched requisition
        reset({
          status: data.status, // Or a sensible default like 'approved' if processing
          issue_date: data.issue_date ? parseISO(data.issue_date) : null,
          notes: data.notes || "",
          items:
            data.items?.map((item) => ({
              id: item.id, // Original StockRequisitionItem ID
              product_id: item.product_id,
              product_name_display: `${item.product?.name || "N/A"} (${
                item.product?.sku || "N/A"
              })`,
              requested_quantity: item.requested_quantity,
              issued_quantity: item.issued_quantity || 0, // Default issued to 0 or existing
              issued_from_purchase_item_id:
                item.issued_from_purchase_item_id || null,
              selected_batch_info: item.issued_batch_number // Pre-fill if already processed
                ? `${item.issued_batch_number} (Avail: ${
                    item.issuedFromPurchaseItemBatch?.remaining_quantity ??
                    "N/A"
                  })`
                : null,
              available_batch_stock:
                item.issuedFromPurchaseItemBatch?.remaining_quantity, // If already processed
              status: item.status || "pending",
              item_notes: item.item_notes || "",
            })) || [],
        });
      } catch (err) {
        const errorMsg = stockRequisitionService.getErrorMessage(err);
        console.log(errorMsg, "Error fetching requisition details");
        setError("root", { type: "manual", message: errorMsg });
        toast.error("خطأ", { description: errorMsg });
        // navigate('/admin/inventory/requisitions'); // Optionally navigate back on fatal error
      } finally {
        setIsLoading(false);
      }
    },
    [reset, navigate]
  );

  useEffect(() => {
    if (requisitionId) {
      fetchRequisitionDetails(Number(requisitionId));
    } else {
      toast.error("خطأ", {
        description: "لم يتم توفير معرف الطلب.",
      });
      navigate("/admin/inventory/requisitions");
    }
  }, [requisitionId, fetchRequisitionDetails, navigate]);

  // --- Debounced Product Search for items (if needed by RequisitionItemsProcessingList) ---
  // const fetchProductsForBatchSelect = useCallback(async (search: string) => { /* ... */ }, [t]);
  // useEffect(() => { /* ... Product debounce effect ... */ }, [productSearchInput]);
  // useEffect(() => { fetchProductsForBatchSelect(debouncedProductSearch); }, [debouncedProductSearch, fetchProductsForBatchSelect]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<ProcessRequisitionFormValues> = async (
    data
  ) => {
    if (!requisitionId) return;
    setServerError(null);

    // Auto-determine overall status if not explicitly set to 'rejected' or 'cancelled' by manager
    let determinedStatus = data.status;
    const allItemsProcessedForItemStatus = data.items.every(
      (item) => item.status === "issued" || item.status === "rejected_item"
    );
    const anyItemIssued = data.items.some(
      (item) => item.status === "issued" && item.issued_quantity > 0
    );

    if (!["rejected", "cancelled"].includes(data.status)) {
      // Only auto-adjust if not explicitly rejected/cancelled
      if (allItemsProcessedForItemStatus) {
        const allRequestedFullyIssued = data.items.every(
          (item) =>
            item.status === "rejected_item" ||
            item.issued_quantity === item.requested_quantity
        );
        if (anyItemIssued) {
          determinedStatus = allRequestedFullyIssued
            ? "issued"
            : "partially_issued";
        } else {
          // No items issued, all were rejected (or pending with 0 qty)
          determinedStatus = "rejected";
        }
      } else if (anyItemIssued) {
        // Some items processed, some still pending
        determinedStatus = "partially_issued";
      } else {
        // No items issued, some still pending or user set to 'approved'
        determinedStatus = "approved"; // Or keep as 'approved' if manager chose it
      }
    }

    const apiData: ProcessRequisitionData = {
      status: determinedStatus,
      issue_date:
        (determinedStatus === "issued" ||
          determinedStatus === "partially_issued") &&
        data.issue_date
          ? format(data.issue_date, "yyyy-MM-dd")
          : null,
      notes: data.notes || null,
      items: data.items.map((item) => ({
        id: item.id, // This is the StockRequisitionItem ID
        issued_quantity: Number(item.issued_quantity) || 0,
        issued_from_purchase_item_id:
          (Number(item.issued_quantity) || 0) > 0
            ? item.issued_from_purchase_item_id
            : null,
        status:
          (Number(item.issued_quantity) || 0) > 0
            ? "issued"
            : item.status === "rejected_item"
            ? "rejected_item"
            : "pending",
        item_notes: item.item_notes || null,
      })),
    };
    console.log("Processing Stock Requisition with data:", apiData);

    try {
      await stockRequisitionService.processRequisition(
        Number(requisitionId),
        apiData
      );
      toast.success("تم بنجاح", {
        description: "تم معالجة الطلب بنجاح",
      });
      navigate("/admin/inventory/requisitions");
    } catch (err) {
      console.error("Failed to process stock requisition:", err);
      const generalError = stockRequisitionService.getErrorMessage(err);
      const apiErrors = stockRequisitionService.getValidationErrors(err);
      toast.error("خطأ", { description: generalError });
      setServerError(generalError);
      if (apiErrors) {
        console.log(apiErrors,'apiErrors');
        Object.entries(apiErrors).forEach(([key, messages]) => {
          const itemMatch = key.match(/^items\.(\d+)\.(.+)$/);
          if (itemMatch) {
            const [, index, fieldName] = itemMatch;
            setError(
              `items.${index}.${fieldName as keyof ProcessItemFormValues}`,
              { type: "server", message: messages[0] }
            );
          } else if (key in ({} as ProcessRequisitionFormValues)) {
            setError(key as keyof ProcessRequisitionFormValues, {
              type: "server",
              message: messages[0],
            });
          }
        });
        if (Object.keys(apiErrors).length > 0)
          setServerError("يرجى التحقق من الحقول");
      }
    }
  };

  // --- Render Page ---
  if (isLoading && !requisition) {
    return (
      <div className="flex justify-center items-center h-screen dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (serverError && !isLoading) {
    // Error during initial load
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>خطأ</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="me-2 h-4 w-4" />
          رجوع
        </Button>
      </div>
    );
  }
  if (!requisition && !isLoading) {
    // Requisition not found
    return (
      <div className="p-6 text-center">
        <Alert>
          <AlertDescription>
            الطلب غير موجود
          </AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="me-2 h-4 w-4" />
          رجوع
        </Button>
      </div>
    ); // Add key
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/admin/inventory/requisitions")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold">
          معالجة الطلب #{requisition?.id}
        </h1>
      </div>

      {/* FormProvider makes RHF methods available to child components */}
      <FormProvider {...formMethods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          {/* Display Requisition Header Info (Read-only) */}
          {requisition && (
            <RequisitionHeaderDisplay requisition={requisition} />
          )}

          {serverError && !isSubmitting && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>خطأ</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Items Processing List - Passes original items for reference and context */}
          {requisition?.items && (
            <RequisitionItemsProcessingList
              originalRequisitionItems={requisition.items} // Pass original items from fetched data
              isSubmitting={isSubmitting}
              // Pass product search related props if RequisitionItemProcessingRow needs to search all products
              // This might be simpler if batch selection within the row fetches its own product's batches
            />
          )}

          <Separator />

          {/* Overall Status and Manager Notes Form Section */}
          <RequisitionOverallStatusForm isSubmitting={isSubmitting} />

          {/* Submit Button */}
          <div className="flex justify-end mt-8">
            <Button
              type="submit"
              disabled={isSubmitting || isLoading}
              size="lg"
            >
              {isSubmitting && (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              )}
              إرسال المعالجة
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default ProcessRequisitionPage;
