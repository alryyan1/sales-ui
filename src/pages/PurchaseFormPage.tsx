// src/pages/PurchaseFormPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

// Import Child Components
import { PurchaseHeaderFormSection } from "../components/purchases/PurchaseHeaderFormSection";

// MUI Components
import {
  Button,
  Card,
  CardContent,
  Alert,
  AlertTitle,
  Box,
  Typography,
  IconButton,
  Paper,
  Container,
  Fade,
} from "@mui/material";

// Lucide Icons
import {
  ArrowRight,
  AlertCircle,
  Save,
  ShoppingCart,
  Loader2,
} from "lucide-react";

// Services and Types
import purchaseService, {
  CreatePurchaseData,
} from "../services/purchaseService";
import supplierService, { Supplier } from "../services/supplierService";
import apiClient from "@/lib/axios";
import { warehouseService, Warehouse } from "../services/warehouseService";
import { useSettings } from "@/context/SettingsContext";

// --- Type Definitions ---
export type PurchaseFormValues = {
  warehouse_id: number;
  supplier_id: number;
  purchase_date: Date;
  status: "received" | "pending" | "ordered";
  currency: "SDG" | "USD";
  reference_number?: string | null;
  notes?: string | null;
};

// --- Component ---
const PurchaseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { getSetting } = useSettings();

  // --- State ---
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Search States
  const [supplierSearchInput, setSupplierSearchInput] = useState("");
  const [debouncedSupplierSearch, setDebouncedSupplierSearch] = useState("");
  const supplierDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSupplierSearchRef = useRef<string>("");

  // Selected objects for display
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  // Warehouse State
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  // --- React Hook Form Setup ---
  const formMethods = useForm<PurchaseFormValues>({
    defaultValues: {
      warehouse_id: 1,
      supplier_id: undefined as any,
      purchase_date: new Date(),
      status: "pending" as const, // Default "pending"
      currency: (getSetting("default_purchase_currency") ?? "SDG") as "SDG" | "USD",
      reference_number: "",
      notes: "",
    },
    mode: "onChange",
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    setError,
  } = formMethods;

  // --- Initial suppliers load ---
  useEffect(() => {
    const loadInitialSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const response = await supplierService.getSuppliers(1, "");
        setSuppliers(response.data ?? []);
      } catch (error) {
        console.error("Failed to load initial suppliers:", error);
        toast.error("خطأ", {
          description: supplierService.getErrorMessage(error),
        });
      } finally {
        setLoadingSuppliers(false);
      }
    };
    loadInitialSuppliers();
  }, []);

  // --- Debounce Effects ---
  useEffect(() => {
    if (supplierDebounceRef.current) clearTimeout(supplierDebounceRef.current);
    supplierDebounceRef.current = setTimeout(() => {
      setDebouncedSupplierSearch(supplierSearchInput);
    }, 300);
    return () => {
      if (supplierDebounceRef.current)
        clearTimeout(supplierDebounceRef.current);
    };
  }, [supplierSearchInput]);

  useEffect(() => {
    if (
      debouncedSupplierSearch !== "" &&
      debouncedSupplierSearch !== lastSupplierSearchRef.current
    ) {
      lastSupplierSearchRef.current = debouncedSupplierSearch;
      const searchSuppliers = async () => {
        setLoadingSuppliers(true);
        try {
          const response = await apiClient.get<{ data: Supplier[] }>(
            `/suppliers?search=${encodeURIComponent(
              debouncedSupplierSearch,
            )}&limit=15`,
          );
          setSuppliers((response.data as any).data ?? response.data);
        } catch (error) {
          toast.error("خطأ", {
            description: supplierService.getErrorMessage(error),
          });
          setSuppliers([]);
        } finally {
          setLoadingSuppliers(false);
        }
      };
      searchSuppliers();
    }
  }, [debouncedSupplierSearch]);

  // --- Fetch Warehouses on Mount ---
  useEffect(() => {
    const fetchWarehouses = async () => {
      setLoadingWarehouses(true);
      try {
        const data = await warehouseService.getAll();
        setWarehouses(data);
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
        toast.error("فشل تحميل المخازن");
      } finally {
        setLoadingWarehouses(false);
      }
    };
    fetchWarehouses();
  }, []);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<PurchaseFormValues> = useCallback(
    async (data) => {
      setServerError(null);

      // Manual validation
      if (!data.supplier_id || data.supplier_id <= 0) {
        setError("supplier_id", {
          type: "manual",
          message: "يرجى اختيار مورد",
        });
        return;
      }

      if (!data.purchase_date) {
        setError("purchase_date", {
          type: "manual",
          message: "هذا الحقل مطلوب",
        });
        return;
      }

      if (!data.status) {
        setError("status", { type: "manual", message: "هذا الحقل مطلوب" });
        return;
      }

      if (!data.currency) {
        setError("currency", { type: "manual", message: "هذا الحقل مطلوب" });
        return;
      }

      const apiData: CreatePurchaseData = {
        ...data,
        purchase_date: format(data.purchase_date as Date, "yyyy-MM-dd"),
        items: [], // Start with empty items, added in next screen
      };

      try {
        const createdPurchase = await purchaseService.createPurchase(apiData);
        toast.success("نجح", { description: "تم إنشاء المشتريات بنجاح" });

        if (createdPurchase?.purchase?.id) {
          navigate(`/purchases/${createdPurchase.purchase.id}/manage-items`);
        } else {
          navigate("/purchases");
        }
      } catch (err) {
        console.error("Failed to create purchase:", err);
        const generalError = purchaseService.getErrorMessage(err);
        const apiErrors = purchaseService.getValidationErrors(err);
        toast.error("خطأ", { description: generalError });
        setServerError(generalError);
        if (apiErrors) {
          Object.entries(apiErrors).forEach(([key, messages]) => {
            if (key in ({} as PurchaseFormValues)) {
              setError(key as keyof PurchaseFormValues, {
                type: "server",
                message: messages[0],
              });
            }
          });
          setServerError("يرجى التحقق من الحقول");
        }
      }
    },
    [navigate, setError],
  );

  return (
    <Box
      sx={{
        bgcolor: "#f8fafc",
        pb: 6,
        pt: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header Section */}
        <Fade in timeout={300}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2.5, sm: 3, md: 4 },
              mb: 3,
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "stretch", md: "center" },
                justifyContent: "space-between",
                gap: 3,
              }}
            >
              {/* Left Side: Back button and Title */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                <IconButton
                  onClick={() => navigate("/purchases")}
                  sx={{
                    bgcolor: "grey.100",
                    border: "1px solid",
                    borderColor: "grey.200",
                    width: 44,
                    height: 44,
                    "&:hover": {
                      bgcolor: "primary.50",
                      borderColor: "primary.300",
                      color: "primary.main",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ArrowRight size={20} />
                </IconButton>

                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <ShoppingCart size={24} color="white" />
                  </Box>
                  <Box>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 700,
                          color: "grey.800",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        إضافة مشتريات جديدة
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ color: "grey.500", mt: 0.5 }}
                    >
                      إنشاء عملية شراء جديدة للمخزون
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Right Side: Action Buttons */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  onClick={handleSubmit(onSubmit)}
                  startIcon={
                    isSubmitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )
                  }
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    px: 3,
                    py: 1.25,
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                    "&:hover": {
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
                      boxShadow: "0 6px 16px rgba(59, 130, 246, 0.4)",
                    },
                    "&:disabled": {
                      background: "grey.300",
                      boxShadow: "none",
                    },
                  }}
                >
                  {isSubmitting ? "جاري الحفظ..." : "إنشاء"}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Fade>

        {/* Main Form Card */}
        <Fade in timeout={400}>
          <Card
            sx={{
              bgcolor: "background.paper",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            <FormProvider {...formMethods}>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                  {/* Server Error Alert */}
               =

                  {/* Header Form Section */}
                  <PurchaseHeaderFormSection
                    suppliers={suppliers}
                    loadingSuppliers={loadingSuppliers}
                    supplierSearchInput={supplierSearchInput}
                    onSupplierSearchInputChange={setSupplierSearchInput}
                    isSubmitting={isSubmitting}
                    selectedSupplier={selectedSupplier}
                    onSupplierSelect={setSelectedSupplier}
                    isPurchaseReceived={false}
                    warehouses={warehouses}
                    loadingWarehouses={loadingWarehouses}
                    isEditMode={false}
                  />
                </CardContent>
              </form>
            </FormProvider>
          </Card>
        </Fade>
      </Container>
    </Box>
  );
};

export default PurchaseFormPage;
