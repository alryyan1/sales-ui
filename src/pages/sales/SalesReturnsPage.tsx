import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
} from "@mui/material";
import { Search, Loader2, RefreshCw, Undo2, History } from "lucide-react";
import saleService, {
  Sale,
  SaleItem,
  CreateSaleReturnData,
  SaleReturnItemData,
} from "../../services/saleService";
import { toast } from "sonner";
import { formatNumber } from "@/constants";
import { useNavigate } from "react-router-dom";

const SalesReturnsPage = () => {
  const navigate = useNavigate();
  // Search State
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [sale, setSale] = useState<Sale | null>(null);

  // Return Form State
  const [selectedItems, setSelectedItems] = useState<{
    [itemId: number]: {
      quantity: number;
      condition: "resellable" | "damaged";
    };
  }>({});

  const [returnReason, setReturnReason] = useState("");
  const [notes, setNotes] = useState("");
  const [creditAction, setCreditAction] = useState<"refund" | "store_credit">(
    "refund"
  );
  const [submitting, setSubmitting] = useState(false);

  // Search Handler
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!invoiceNumber.trim()) return;

    setLoading(true);
    setSale(null);
    setSelectedItems({}); // Reset form

    try {
      // Searching by query params: ?search=INV-XXXX
      // We expect a list, take the first match
      const result = await saleService.getSales(
        1,
        `search=${encodeURIComponent(invoiceNumber.trim())}`
      );

      if (result.data && result.data.length > 0) {
        // Fetch full details of the first match
        const fullSale = await saleService.getSale(result.data[0].id);
        setSale(fullSale);
      } else {
        toast.error("لم يتم العثور على فاتورة بهذا الرقم");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("حدث خطأ أثناء البحث");
    } finally {
      setLoading(false);
    }
  };

  // Item Selection Handler
  const handleItemToggle = (item: SaleItem) => {
    if (!item.id) return;

    setSelectedItems((prev) => {
      const newItems = { ...prev };
      if (newItems[item.id!]) {
        delete newItems[item.id!];
      } else {
        newItems[item.id!] = {
          quantity: 1, // Default 1
          condition: "resellable",
        };
      }
      return newItems;
    });
  };

  const handleItemChange = (
    itemId: number,
    field: "quantity" | "condition",
    value: any
  ) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: field === "quantity" ? Number(value) : value,
      },
    }));
  };

  // Calculations
  const calculateTotalRefund = () => {
    if (!sale) return 0;
    let total = 0;
    Object.entries(selectedItems).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      const item = sale.items?.find((i) => i.id === itemId);
      if (item) {
        total += Number(item.unit_price) * data.quantity;
      }
    });
    return total;
  };

  // Submission Handler
  const handleSubmit = async () => {
    if (!sale) return;

    const itemsToReturn: SaleReturnItemData[] = [];
    let isValid = true;

    // Build payload
    Object.entries(selectedItems).forEach(([itemIdStr, data]) => {
      const itemId = Number(itemIdStr);
      const originalItem = sale.items?.find((i) => i.id === itemId);

      if (!originalItem) return;

      if (data.quantity > originalItem.quantity) {
        toast.error(
          `الكمية المرجعة للصنف ${originalItem.product?.name} تتجاوز الكمية المباعة`
        );
        isValid = false;
        return;
      }
      if (data.quantity <= 0) {
        toast.error(
          `الكمية يجب أن تكون أكبر من 0 للصنف ${originalItem.product?.name}`
        );
        isValid = false;
        return;
      }

      itemsToReturn.push({
        original_sale_item_id: originalItem.id!,
        product_id: originalItem.product_id,
        quantity_returned: data.quantity,
        condition: data.condition,
        return_to_purchase_item_id: originalItem.purchase_item_id, // Attempt to return to same batch
      });
    });

    if (!isValid) return;
    if (itemsToReturn.length === 0) {
      toast.warning("يرجى اختيار عنصر واحد على الأقل للإرجاع");
      return;
    }

    const payload: CreateSaleReturnData = {
      original_sale_id: sale.id,
      return_date: new Date().toISOString().split("T")[0], // Today
      return_reason: returnReason || "No reason provided",
      notes: notes,
      status: "completed", // Auto-complete for now
      credit_action: creditAction,
      refunded_amount: calculateTotalRefund(),
      items: itemsToReturn,
    };

    setSubmitting(true);
    try {
      await saleService.createSaleReturn(payload);
      toast.success("تم إنشاء طلب الإرجاع بنجاح");
      // Reset
      setSale(null);
      setInvoiceNumber("");
      setSelectedItems({});
      setReturnReason("");
      setNotes("");
    } catch (error: any) {
      console.error("Return creation failed:", error);
      const msg = error?.response?.data?.message || "فشل إنشاء طلب الإرجاع";
      // Check for backend validation errors (e.g. max quantity exceeded)
      if (error?.response?.data?.errors) {
        const firstErr = Object.values(error.response.data.errors)[0];
        if (Array.isArray(firstErr)) toast.error(firstErr[0]);
        else toast.error(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: "auto", direction: "ltr" }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Typography variant="h4" fontWeight="bold" color="primary">
            مردودات المبيعات
          </Typography>
          <Undo2 size={32} className="text-blue-500" />
        </Box>
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={() => navigate("/sales/returns")}
        >
          سجل المردودات
        </Button>
      </Box>

      {/* Steps: 1. Search */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom fontWeight="bold">
          الخطوة 1: البحث عن الفاتورة
        </Typography>
        <Box
          component="form"
          onSubmit={handleSearch}
          sx={{ display: "flex", gap: 2, alignItems: "center" }}
        >
          <TextField
            label="رقم الفاتورة (Invoice No)"
            placeholder="مثال: INV-1001"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            fullWidth
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">#</InputAdornment>
              ),
            }}
          />
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !invoiceNumber.trim()}
            startIcon={
              loading ? <Loader2 className="animate-spin" /> : <Search />
            }
            sx={{ px: 4, height: 56 }}
          >
            بحث
          </Button>
        </Box>
      </Paper>

      {/* Steps: 2. Details & Form */}
      {sale && (
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          {/* Header Info */}
          <Box
            sx={{
              mb: 3,
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 2,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                العميل
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {sale.client?.name || "عميل نقدي"}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                تاريخ البيع
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {sale.sale_date}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                الإجمالي
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatNumber(sale.total_amount)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                حالة البيع
              </Typography>
              <Typography
                variant="body1"
                fontWeight="bold"
                color={
                  sale.status === "completed" ? "success.main" : "warning.main"
                }
              >
                {sale.status}
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="h6"
            gutterBottom
            fontWeight="bold"
            sx={{ mt: 4 }}
          >
            الخطوة 2: تحديد الأصناف للإرجاع
          </Typography>

          <Alert severity="info" sx={{ mb: 2 }}>
            قم بتحديد الأصناف التي يرغب العميل بإرجاعها وتعديل الكمية إذا لزم
            الأمر.
          </Alert>

          <TableContainer
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              mb: 3,
            }}
          >
            <Table>
              <TableHead sx={{ bgcolor: "grey.100" }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Typography variant="caption">إرجاع</Typography>
                  </TableCell>
                  <TableCell>الصنف</TableCell>
                  <TableCell align="center">الكمية المباعة</TableCell>
                  <TableCell align="center">سعر الوحدة</TableCell>
                  <TableCell align="center" width={120}>
                    الكمية المرجعة
                  </TableCell>
                  <TableCell align="center" width={150}>
                    الحالة
                  </TableCell>
                  <TableCell align="right">قيمة الإرجاع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.items?.map((item) => {
                  if (!item.id) return null;
                  const isSelected = !!selectedItems[item.id];
                  const currentSelection = selectedItems[item.id] || {
                    quantity: 1,
                    condition: "resellable",
                  };

                  return (
                    <TableRow key={item.id} selected={isSelected} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleItemToggle(item)}
                          color="error" // Red for return
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {item.product?.name || item.product_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product?.sku}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="center">
                        {formatNumber(Number(item.unit_price))}
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          disabled={!isSelected}
                          value={isSelected ? currentSelection.quantity : ""}
                          onChange={(e) =>
                            handleItemChange(
                              item.id!,
                              "quantity",
                              e.target.value
                            )
                          }
                          inputProps={{ min: 1, max: item.quantity }}
                          error={
                            isSelected &&
                            (currentSelection.quantity > item.quantity ||
                              currentSelection.quantity <= 0)
                          }
                        />
                      </TableCell>
                      <TableCell align="center">
                        <FormControl
                          size="small"
                          fullWidth
                          disabled={!isSelected}
                        >
                          <Select
                            value={currentSelection.condition}
                            onChange={(e) =>
                              handleItemChange(
                                item.id!,
                                "condition",
                                e.target.value
                              )
                            }
                          >
                            <MenuItem value="resellable">
                              سليم (قابل للبيع)
                            </MenuItem>
                            <MenuItem value="damaged">تالف</MenuItem>
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: "bold",
                          color: isSelected ? "error.main" : "text.secondary",
                        }}
                      >
                        {isSelected
                          ? formatNumber(
                              currentSelection.quantity *
                                Number(item.unit_price)
                            )
                          : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {Object.keys(selectedItems).length > 0 && (
            <Box
              sx={{
                mt: 4,
                p: 3,
                border: "1px dashed",
                borderColor: "primary.main",
                borderRadius: 2,
                bgcolor: "primary.50",
              }}
            >
              <Typography
                variant="h6"
                gutterBottom
                fontWeight="bold"
                color="primary.dark"
              >
                الخطوة 3: ملخص وخيارات الإرجاع
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    إجمالي قيمة الإرجاع
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {formatNumber(calculateTotalRefund())}{" "}
                    <Typography
                      component="span"
                      variant="body1"
                      color="text.secondary"
                    >
                      ر.س
                    </Typography>
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>طريقة الإرجاع</InputLabel>
                    <Select
                      label="طريقة الإرجاع"
                      value={creditAction}
                      onChange={(e) => setCreditAction(e.target.value as any)}
                    >
                      <MenuItem value="refund">إسترداد نقدي (Refund)</MenuItem>
                      <MenuItem value="store_credit">
                        رصيد للعميل (Credit)
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    label="سبب الإرجاع"
                    fullWidth
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="مثال: المنتج تالف، العميل غير رأيه..."
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    label="ملاحظات إضافية"
                    fullWidth
                    multiline
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Box
                sx={{
                  mt: 4,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => setSale(null)}
                  disabled={submitting}
                >
                  إلغاء
                </Button>
                <Button
                  variant="contained"
                  color="error" // Red for return action
                  size="large"
                  onClick={handleSubmit}
                  disabled={submitting || calculateTotalRefund() <= 0}
                  startIcon={
                    submitting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )
                  }
                  sx={{ px: 4 }}
                >
                  تأكيد الإرجاع
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};
export default SalesReturnsPage;
