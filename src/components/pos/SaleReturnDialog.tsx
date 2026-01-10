import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// MUI Components
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Alert,
  AlertTitle,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

// Services and Types
import saleService, {
  CreateSaleReturnData,
  SaleReturnItemData,
} from "../../services/saleService";
import expenseService from "../../services/expenseService";
import { formatNumber } from "@/constants";

interface SaleReturnDialogProps {
  saleId: number | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SaleReturnDialog: React.FC<SaleReturnDialogProps> = ({
  saleId,
  open,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  // State
  const [selectedItems, setSelectedItems] = useState<
    Record<
      number,
      {
        quantity: number;
        condition: "resellable" | "damaged";
        maxReturnable: number;
      }
    >
  >({});
  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [creditAction, setCreditAction] = useState<"refund" | "store_credit">(
    "refund"
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">("cash");

  // Fetch Sale Details
  const {
    data: saleDetails,
    isLoading: isLoadingDetails,
    error: saleError,
  } = useQuery({
    queryKey: ["sale-details", saleId],
    queryFn: async () => {
      if (!saleId) return null;
      return await saleService.getSale(saleId);
    },
    enabled: !!saleId && open,
  });

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSelectedItems({});
      setReturnReason("");
      setNotes("");
      setCreditAction("refund");
      setPaymentMethod("cash");
    }
  }, [open, saleId]);

  // Handlers
  const handleItemToggle = (item: any) => {
    if (!item.id) return;

    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[item.id]) {
        delete newItems[item.id];
      } else {
        newItems[item.id] = {
          quantity: 1,
          condition: "resellable",
          maxReturnable: item.quantity, // Ideally calculate based on previously returned
        };
      }
      return newItems;
    });
  };

  const handleItemChange = (
    itemId: number,
    field: "quantity" | "condition",
    value: string | number
  ) => {
    setSelectedItems((prev) => {
      if (!prev[itemId]) return prev;
      const item = prev[itemId];
      if (field === "quantity") {
        const qty = Math.max(1, Math.min(item.maxReturnable, Number(value)));
        return {
          ...prev,
          [itemId]: { ...item, quantity: qty },
        };
      }
      const conditionValue =
        value === "resellable" || value === "damaged"
          ? value
          : ("resellable" as "resellable" | "damaged");
      return {
        ...prev,
        [itemId]: { ...item, condition: conditionValue },
      };
    });
  };

  const calculateTotalRefund = (): number => {
    if (!saleDetails) return 0;
    let total = 0;
    Object.entries(selectedItems).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      const item = saleDetails.items?.find((i) => i.id === itemId);
      if (item) {
        total += Number(item.unit_price) * data.quantity;
      }
    });
    return total;
  };

  const createReturnMutation = useMutation({
    mutationFn: async (data: CreateSaleReturnData) => {
      return await saleService.createSaleReturn(data);
    },
    onSuccess: async (returnedSale) => {
      toast.success("تم إنشاء طلب الإرجاع بنجاح");

      // Create expense if refund was selected
      if (creditAction === "refund" && totalRefund > 0) {
        try {
          await expenseService.createExpense({
            title: `إرجاع مبيعات - فاتورة #${
              saleDetails?.invoice_number || saleId
            }`,
            amount: totalRefund,
            expense_date: new Date().toISOString().split("T")[0],
            payment_method: paymentMethod,
            description: `إرجاع أصناف من الفاتورة رقم ${
              saleDetails?.invoice_number
            }. سبب الإرجاع: ${returnReason || "غير محدد"}. رقم عملية الإرجاع: ${
              returnedSale.id
            }`,
            reference: `SALE-RETURN-${returnedSale.id}`,
          });
          toast.info("تم تسجيل مصروف الإرجاع بنجاح");
        } catch (expenseError) {
          console.error(
            "Failed to create expense for sale return:",
            expenseError
          );
          toast.error("تم الإرجاع ولكن فشل تسجيل المصروف");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["sale-returns"] }); // Invalidate returns list
      queryClient.invalidateQueries({ queryKey: ["sales"] }); // Invalidate sales list (for POS/Reports)
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.message || "فشل إنشاء طلب الإرجاع";
      toast.error(errorMsg);
    },
  });

  const handleSubmit = () => {
    if (!saleDetails) return;

    const itemsToReturn: SaleReturnItemData[] = [];
    let isValid = true;

    Object.entries(selectedItems).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      const originalItem = saleDetails.items?.find((i) => i.id === itemId);

      if (!originalItem || !originalItem.id) {
        isValid = false;
        return;
      }

      itemsToReturn.push({
        original_sale_item_id: originalItem.id,
        product_id: originalItem.product_id,
        quantity_returned: data.quantity,
        condition: data.condition,
        return_to_purchase_item_id: originalItem.purchase_item_id || null,
      });
    });

    if (itemsToReturn.length === 0) {
      toast.warning("يرجى اختيار عنصر واحد على الأقل للإرجاع");
      return;
    }

    if (!isValid) return;

    const payload: CreateSaleReturnData = {
      original_sale_id: saleDetails.id,
      return_date: new Date().toISOString().split("T")[0],
      return_reason: returnReason || "لا يوجد سبب محدد (POS)",
      notes: notes,
      status: "completed",
      credit_action: creditAction,
      refunded_amount: calculateTotalRefund(),
      items: itemsToReturn,
    };

    createReturnMutation.mutate(payload);
  };

  const totalRefund = calculateTotalRefund();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6" fontWeight="bold">
            إرجاع فاتورة #{saleDetails?.invoice_number || saleId}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {isLoadingDetails ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : saleError ? (
          <Alert severity="error">
            <AlertTitle>خطأ</AlertTitle>
            فشل تحميل تفاصيل الفاتورة
          </Alert>
        ) : saleDetails ? (
          <Stack spacing={3}>
            {/* Items Table */}
            <Box>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                تحديد الأصناف للإرجاع
              </Typography>
              <TableContainer
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox"></TableCell>
                      <TableCell>الصنف</TableCell>
                      <TableCell align="center">الكمية المباعة</TableCell>
                      <TableCell align="center">سعر الوحدة</TableCell>
                      <TableCell align="center" width={100}>
                        الكمية المرجعة
                      </TableCell>
                      <TableCell align="center" width={150}>
                        الحالة
                      </TableCell>
                      <TableCell align="right">القيمة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {saleDetails.items?.map((item) => {
                      const isSelected = !!selectedItems[item.id!];
                      const selection = selectedItems[item.id!] || {
                        quantity: 1,
                        condition: "resellable",
                        maxReturnable: item.quantity,
                      };

                      return (
                        <TableRow key={item.id} selected={isSelected}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={isSelected}
                              onChange={() => handleItemToggle(item)}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {item.product?.name || item.product_name}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {formatNumber(item.quantity)}
                          </TableCell>
                          <TableCell align="center">
                            {formatNumber(item.unit_price)}
                          </TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{
                                min: 1,
                                max: selection.maxReturnable,
                              }}
                              value={isSelected ? selection.quantity : ""}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id!,
                                  "quantity",
                                  e.target.value
                                )
                              }
                              disabled={!isSelected}
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Select
                              size="small"
                              value={isSelected ? selection.condition : ""}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id!,
                                  "condition",
                                  e.target.value
                                )
                              }
                              disabled={!isSelected}
                              fullWidth
                            >
                              <MenuItem value="resellable">سليم</MenuItem>
                              <MenuItem value="damaged">تالف</MenuItem>
                            </Select>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: "bold" }}>
                            {isSelected
                              ? formatNumber(
                                  selection.quantity * Number(item.unit_price)
                                )
                              : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            {/* Refund Options & Reason */}
            {Object.keys(selectedItems).length > 0 && (
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                  <Box flex={1}>
                    <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                      <InputLabel>طريقة الإرجاع</InputLabel>
                      <Select
                        label="طريقة الإرجاع"
                        value={creditAction}
                        onChange={(e) => setCreditAction(e.target.value as any)}
                      >
                        <MenuItem value="refund">إسترداد نقدي</MenuItem>
                        <MenuItem value="store_credit">رصيد للعميل</MenuItem>
                      </Select>
                    </FormControl>

                    {creditAction === "refund" && (
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>طريقة دفع المسترد</InputLabel>
                        <Select
                          label="طريقة دفع المسترد"
                          value={paymentMethod}
                          onChange={(e) =>
                            setPaymentMethod(e.target.value as any)
                          }
                        >
                          <MenuItem value="cash">نقدي (Cash)</MenuItem>
                          <MenuItem value="bank">تحويل بنكي (Bank)</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    <TextField
                      label="سبب الإرجاع"
                      fullWidth
                      size="small"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </Box>
                  <Box sx={{ minWidth: 200, textAlign: "right" }}>
                    <Typography variant="body2" color="text.secondary">
                      إجمالي الإرجاع
                    </Typography>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="error.main"
                    >
                      {formatNumber(totalRefund)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      عدد الأصناف: {Object.keys(selectedItems).length}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            )}
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            createReturnMutation.isPending ||
            Object.keys(selectedItems).length === 0
          }
          color="error" // Red for return action
        >
          {createReturnMutation.isPending
            ? "جاري المعالجة..."
            : "تأكيد الإرجاع"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
