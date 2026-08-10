// src/pages/PurchaseFormPage.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useForm, FormProvider, SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

// Import Child Components
import { PurchaseHeaderFormSection } from "../components/purchases/PurchaseHeaderFormSection";
import PurchaseFormPageHeader from "@/components/purchases/PurchaseFormPageHeader";

// MUI Components
import {
  Button,
  CardContent,
  Alert,
  AlertTitle,
  Box,
  Typography,
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
  currency: "SDG" | "OMR" | "USD";
  reference_number?: string | null;
  notes?: string | null;
};

// --- Component ---
const PurchaseFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { getSetting, isLoadingSettings } = useSettings();
  const { t } = useTranslation("purchases");
  const { t: tCommon } = useTranslation("common");

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
      currency: (getSetting("default_purchase_currency") ?? getSetting("currency_code") ?? "SDG") as "SDG" | "OMR" | "USD",
      reference_number: "",
      notes: "",
    },
    mode: "onChange",
  });

  const {
    handleSubmit,
    formState: { isSubmitting, dirtyFields },
    setError,
    setValue,
  } = formMethods;

  // `defaultValues` above runs before settings finish loading, so it can't see
  // `default_purchase_currency` / `currency_code` yet — sync it once settings
  // arrive, unless the user has already picked a currency themselves.
  useEffect(() => {
    if (isLoadingSettings || dirtyFields.currency) return;
    const defaultCurrency =
      getSetting("default_purchase_currency") ?? getSetting("currency_code") ?? "SDG";
    setValue("currency", defaultCurrency as "SDG" | "OMR" | "USD");
  }, [isLoadingSettings, getSetting, setValue, dirtyFields.currency]);

  // --- Initial suppliers load ---
  useEffect(() => {
    const loadInitialSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const response = await supplierService.getSuppliers(1, "");
        setSuppliers(response.data ?? []);
      } catch (error) {
        console.error("Failed to load initial suppliers:", error);
        toast.error(tCommon("error"), {
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
          toast.error(tCommon("error"), {
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
        toast.error(t("failedToLoadWarehouses"));
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
          message: t("supplierRequiredError"),
        });
        return;
      }

      if (!data.purchase_date) {
        setError("purchase_date", {
          type: "manual",
          message: t("purchaseDateRequiredError"),
        });
        return;
      }

      if (!data.status) {
        setError("status", { type: "manual", message: t("statusRequiredError") });
        return;
      }

      if (!data.currency) {
        setError("currency", { type: "manual", message: t("currencyRequiredError") });
        return;
      }

      const apiData: CreatePurchaseData = {
        ...data,
        purchase_date: format(data.purchase_date as Date, "yyyy-MM-dd"),
        items: [], // Start with empty items, added in next screen
      };

      try {
        const createdPurchase = await purchaseService.createPurchase(apiData);
        toast.success(tCommon("success"), { description: t("purchaseCreatedSuccess") });

        if (createdPurchase?.purchase?.id) {
          navigate(`/purchases/${createdPurchase.purchase.id}/manage-items`);
        } else {
          navigate("/purchases");
        }
      } catch (err) {
        console.error("Failed to create purchase:", err);
        const generalError = purchaseService.getErrorMessage(err);
        const apiErrors = purchaseService.getValidationErrors(err);
        toast.error(tCommon("error"), { description: generalError });
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
          setServerError(t("checkFieldsError"));
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
          <PurchaseFormPageHeader
            onBack={() => navigate("/purchases")}
            onSubmit={handleSubmit(onSubmit)}
            isSubmitting={isSubmitting}
          />
        </Fade>

        {/* Main Form Card */}
        <Fade in timeout={400}>
          <Paper
            elevation={0}
            sx={{
              bgcolor: "background.paper",
              borderRadius: 3,
              border: "1px solid",
              borderColor: "grey.200",
              overflow: "hidden",
            }}
          >
            <FormProvider {...formMethods}>
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                  {serverError && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      <AlertTitle>{tCommon("error")}</AlertTitle>
                      {serverError}
                    </Alert>
                  )}

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
                </Box>
              </form>
            </FormProvider>
          </Paper>
        </Fade>
      </Container>
    </Box>
  );
};

export default PurchaseFormPage;
