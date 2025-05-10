// src/pages/sales/AddSaleReturnPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  useForm,
  useFieldArray,
  SubmitHandler,
  useWatch,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation, useParams } from "react-router-dom"; // useParams for original_sale_id from URL
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// shadcn/ui & Lucide Icons
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  Loader2,
  Calendar as CalendarIcon,
  ArrowLeft,
  AlertCircle,
} from "lucide-react";

// Services and Types
import saleService, {
  Sale,
  ReturnableSaleItem,
} from "../../services/saleService"; // For fetching original sale & items
import { formatCurrency} from "@/constants";
import saleReturnService from "@/services/saleReturnService";
import { addSaleReturnSchema } from "@/validation/addSaleReturnSchema";


type AddSaleReturnFormValues = z.infer<typeof addSaleReturnSchema>;
// type ReturnItemFormValues = z.infer<typeof returnItemSchema>;


// Then use this type consistently everywhere
// --- Component ---
const AddSaleReturnPage: React.FC = () => {
  const { t } = useTranslation(["sales", "common", "validation", "products"]);
  const navigate = useNavigate();
  const location = useLocation(); // To get state if original_sale_id passed via navigation
  const { originalSaleIdParam } = useParams<{ originalSaleIdParam?: string }>(); // If ID is in URL param

  // --- State ---
  const [originalSale, setOriginalSale] = useState<Sale | null>(null);
  const [returnableItems, setReturnableItems] = useState<ReturnableSaleItem[]>(
    []
  );
  const [loadingSaleData, setLoadingSaleData] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Determine original_sale_id (from URL param or navigation state)
  const initialOriginalSaleId = useMemo(() => {
    return originalSaleIdParam
      ? Number(originalSaleIdParam)
      : location.state?.originalSaleId;
  }, [originalSaleIdParam, location.state]);

  // --- React Hook Form ---
  const formMethods = useForm<AddSaleReturnFormValues>({
    resolver: zodResolver(addSaleReturnSchema),
    defaultValues: {
      original_sale_id: initialOriginalSaleId || undefined,
      return_date: new Date(),
      status: "pending",
      credit_action: "store_credit",
      refunded_amount: 0,
      items: [],
    },
  });
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    setError,
    trigger,
  } = formMethods;
  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" });
  const watchedCreditAction = watch("credit_action");
  const totalReturnedValue =
    watchedItems?.reduce(
      (sum, item) =>
        sum +
        (Number(item.quantity_returned) || 0) * (Number(item.unit_price) || 0),
      0
    ) ?? 0;

  // --- Fetch Original Sale Data & Returnable Items ---
  const loadOriginalSaleAndItems = useCallback(
    async (saleId: number) => {
      if (!saleId) return;
      setLoadingSaleData(true);
      setServerError(null);
      setOriginalSale(null);
      setReturnableItems([]);
      replace([]); // Clear RHF items array

      try {
        const [saleData, itemsData] = await Promise.all([
          saleService.getSale(saleId),
          saleService.getReturnableItems(saleId),
        ]);
        setOriginalSale(saleData);
        setReturnableItems(itemsData); // Store for reference and max qty

        // Populate form items based on returnable items
        // User will then specify quantities to return
        const formItems = itemsData.map((item) => ({
          original_sale_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product?.name || item.product_name, // Use from loaded product if possible
          product_sku: item.product?.sku || item.product_sku,
          quantity_returned: 0, // Default to 0, user specifies actual return quantity
          condition: "resellable", // Default condition
          unit_price: Number(item.unit_price), // Price from original sale
          max_returnable_quantity: item.max_returnable_quantity,
        }));
        setValue("items", formItems); // Set RHF items array

        // Set original_sale_id in form if not already
        if (!watch("original_sale_id")) {
          setValue("original_sale_id", saleId);
        }
      } catch (err) {
        const errorMsg = saleService.getErrorMessage(err);
        setError("root", { message: errorMsg });
        toast.error(t("common:error"), { description: errorMsg });
      } finally {
        setLoadingSaleData(false);
      }
    },
    [t, replace, setValue, watch]
  );

  useEffect(() => {
    if (initialOriginalSaleId) {
      loadOriginalSaleAndItems(initialOriginalSaleId);
    }
  }, [initialOriginalSaleId, loadOriginalSaleAndItems]);

  // --- Form Submission ---
  const onSubmit: SubmitHandler<AddSaleReturnFormValues> = async (data) => {
    setServerError(null);
    console.log(data,'data')
    // Filter out items where quantity_returned is 0 or not set
    const itemsToReturn = data.items.filter(
      (item) => Number(item.quantity_returned) > 0
    );

    if (itemsToReturn.length === 0) {
      toast.error(t("common:error"), {
        description: t("sales:errorNoItemsToReturn"),
      }); // Add key
      setError("items", { message: t("sales:errorNoItemsToReturn") });
      return;
    }

    const apiData = {
      ...data,
      return_date: format(data.return_date as Date, "yyyy-MM-dd"),
      refunded_amount:
        data.credit_action === "refund" ? Number(data.refunded_amount) : 0,
      items: itemsToReturn.map((item) => ({
        original_sale_item_id: item.original_sale_item_id,
        product_id: item.product_id, // Should be correct from original item
        quantity_returned: Number(item.quantity_returned),
        condition: item.condition,
        // unit_price is not sent, backend uses originalSaleItem.unit_price
      })),
    };
    console.log("Submitting Sale Return to API:", apiData);
    try {
      // Create saleReturnService if not done
      await saleReturnService.createSaleReturn(apiData);
      toast.success(t("common:success"), {
        description: t("sales:returnCreateSuccess"),
      }); // Add key
      navigate("/sales"); // Or to a returns list page
    } catch (err) {
      const errorMsg = saleReturnService.getErrorMessage(err);
      setServerError(errorMsg);
      toast.error(t("common:error"), { description: errorMsg });
    }
  };

  // --- Render ---
  if (loadingSaleData && !originalSale) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  
  if (!initialOriginalSaleId && !originalSale) {
    // If no sale ID provided to start
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("common:error")}</AlertTitle>
          <AlertDescription>
            {t("sales:errorNoOriginalSale")}
          </AlertDescription>
          {/* Add key */}
        </Alert>
        {/* TODO: Add an Original Sale search/select Combobox here */}
        <p className="mt-4 text-muted-foreground">
          Implement Original Sale selection here.
        </p>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
          <ArrowLeft className="me-2 h-4 w-4" />
          {t("common:back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 dark:bg-gray-950 min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center mb-6 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate("/sales")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-gray-100">
          {t("sales:addSaleReturnTitle")} {/* Add key */}
          {originalSale &&
            ` (Sale #${originalSale.id} - ${
              originalSale.invoice_number || "N/A"
            })`}
        </h1>
      </div>

      <Card className="dark:bg-gray-900">
        {/* {Object.keys(errors).length > 0 && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    {JSON.stringify(errors)}
    <AlertDescription>
      Please fix the form errors
    </AlertDescription>
  </Alert>
)} */}
        <Form {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(onSubmit)} >
            <CardContent className="pt-6">
              {serverError && !isSubmitting && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}
              {/* Header Section: Return Date, Status, Reason, Credit Action, Refunded Amount, Notes */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-3 mb-8">
                {/* Original Sale ID (Hidden, but in form state) */}
                <FormField
                  control={control}
                  name="original_sale_id"
                  render={({ field }) => <Input type="hidden" {...field} />}
                />
                <FormField
                  control={control}
                  name="return_date"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex flex-col">
                      
                      <FormLabel>
                        {t("sales:returnDate")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Popover>
                        
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              disabled={isSubmitting}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              
                              <CalendarIcon className="me-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>{t("common:pickDate")}</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || isSubmitting
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage>
                        {fieldState.error?.message
                          ? t(fieldState.error.message)
                          : null}
                      </FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>
                        {t("sales:returnStatusLabel")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">
                            {t("sales:status_pending_return")}
                          </SelectItem>
                          <SelectItem value="completed">
                            {t("sales:status_completed_return")}
                          </SelectItem>
                          <SelectItem value="cancelled">
                            {t("sales:status_cancelled_return")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add return status keys */}
                <FormField
                  control={control}
                  name="return_reason"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>{t("sales:returnReasonLabel")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add key */}
                <FormField
                  control={control}
                  name="credit_action"
                  render={({ field }) => (
                    <FormItem>
                      
                      <FormLabel>
                        {t("sales:creditActionLabel")}
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="refund">
                            {t("sales:creditAction_refund")}
                          </SelectItem>
                          <SelectItem value="store_credit">
                            {t("sales:creditAction_store_credit")}
                          </SelectItem>
                          <SelectItem value="none">
                            {t("sales:creditAction_none")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add keys */}
                {watchedCreditAction === "refund" && (
                  <FormField
                    control={control}
                    name="refunded_amount"
                    render={({ field }) => (
                      <FormItem>
                        
                        <FormLabel>{t("sales:refundedAmountLabel")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ""}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  /> // Add key
                )}
                <FormField
                  control={control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="md:col-span-3">
                      <FormLabel>{t("sales:notesLabel")}</FormLabel>
                      <FormControl>
                        <Textarea
                          className="min-h-[60px]"
                          {...field}
                          value={field.value ?? ""}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator className="my-6" />
              {/* Items to Return Section */}
              <h3 className="text-lg font-medium mb-4">
                {t("sales:itemsToReturnTitle")}
              </h3>
              {/* Add key */}
              {errors.items &&
                !Array.isArray(errors.items) &&
                errors.items.root && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {errors.items.root.message}
                    </AlertDescription>
                  </Alert>
                )}
              {loadingSaleData && fields.length === 0 && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <div className="space-y-4">
                {fields.map((item, index) => (
                  <Card
                    key={item.id}
                    className="p-3 dark:bg-gray-800 border dark:border-gray-700"
                  >
                    <div className="grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-12 md:col-span-5">
                        <p className="font-medium text-sm">
                          {watch(`items.${index}.product_name`) ||
                            t("common:product")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {watch(`items.${index}.product_sku`) || "---"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("sales:originalPrice")}:
                          {formatCurrency(watch(`items.${index}.unit_price`))}
                        </p>
                        {/* Add key */}
                        <p className="text-xs text-muted-foreground">
                          {t("sales:maxReturnable")}:
                          {watch(`items.${index}.max_returnable_quantity`)}
                        </p>
                        {/* Add key */}
                      </div>
                      <FormField
                        control={control}
                        name={`items.${index}.quantity_returned`}
                        render={({
                          field: qtyField,
                          fieldState: qtyFieldState,
                        }) => (
                          <FormItem className="col-span-6 md:col-span-3">
                            <FormLabel>
                              {t("sales:quantityToReturn")}*
                            </FormLabel>
                            {/* Add key */}
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max={watch(
                                  `items.${index}.max_returnable_quantity`
                                )}
                                step="1"
                                placeholder="0"
                                {...qtyField}
                                disabled={isSubmitting}
                              />
                            </FormControl>
                            <FormMessage>
                              {qtyFieldState.error?.message
                                ? t(qtyFieldState.error.message)
                                : null}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`items.${index}.condition`}
                        render={({
                          field: condField,
                          fieldState: condFieldState,
                        }) => (
                          <FormItem className="col-span-6 md:col-span-4">
                            <FormLabel>{t("sales:itemCondition")}</FormLabel>
                            {/* Add key */}
                            <Select
                              onValueChange={condField.onChange}
                              defaultValue={condField.value}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t(
                                      "sales:selectConditionPlaceholder"
                                    )}
                                  />
                                </SelectTrigger>
                              </FormControl>
                              {/* Add key */}
                              <SelectContent>
                                <SelectItem value="resellable">
                                  {t("sales:condition_resellable")}
                                </SelectItem>
                                {/* Add key */}
                                <SelectItem value="damaged">
                                  {t("sales:condition_damaged")}
                                </SelectItem>
                                {/* Add key */}
                                <SelectItem value="defective">
                                  {t("sales:condition_defective")}
                                </SelectItem>
                                {/* Add key */}
                              </SelectContent>
                            </Select>
                            <FormMessage>
                              {condFieldState.error?.message
                                ? t(condFieldState.error.message)
                                : null}
                            </FormMessage>
                          </FormItem>
                        )}
                      />
                      {/* No remove button, as user only specifies quantity to return from given list */}
                    </div>
                  </Card>
                ))}
              </div>
              {fields.length === 0 && !loadingSaleData && (
                <p className="text-muted-foreground text-center py-4">
                  {t("sales:noReturnableItems")}
                </p>
              )}
              {/* Add key */}
              <Separator className="my-6" />
              <div className="flex justify-end mb-6">
                <p className="text-lg font-semibold">
                  {t("sales:totalReturnedValue")}:
                  {formatCurrency(totalReturnedValue)}
                </p>
              </div>
              {/* Add key */}
              <div className="flex justify-end">
                <Button
                
                  type="submit"
                  disabled={
                    isSubmitting || loadingSaleData || fields.length === 0
                  }
                  size="lg"
                >
                  {isSubmitting && (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  )}
                  {t("sales:submitReturn")} {/* Add key */}
                </Button>
              </div>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default AddSaleReturnPage;
