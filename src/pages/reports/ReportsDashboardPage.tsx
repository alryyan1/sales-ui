import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import { TrendingUp, Clock, PackageX, RefreshCcw } from "lucide-react";
import reportService, {
  BestSellingProduct,
  StagnantProduct,
  ExpiringProduct,
} from "../../services/reportService";
import { formatCurrency, formatNumber } from "../../constants";
import { format, isPast, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";

const ReportsDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [bestSelling, setBestSelling] = useState<BestSellingProduct[]>([]);
  const [stagnant, setStagnant] = useState<StagnantProduct[]>([]);
  const [expiring, setExpiring] = useState<ExpiringProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bestSellingData, stagnantData, expiringData] = await Promise.all([
        reportService.getBestSellingProducts(30, 10), // Last 30 days, top 10
        reportService.getStagnantProducts(3, 10), // No sales in 3 months, top 10
        reportService.getExpiringProducts(6, 15), // Expiring in 6 months, top 15
      ]);
      setBestSelling(bestSellingData);
      setStagnant(stagnantData);
      setExpiring(expiringData);
    } catch (err: unknown) {
      console.error("Failed to load reports:", err);
      setError("فشل في تحميل التقارير الإحصائية. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getExpiryStatus = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isPast(date))
      return { color: "error" as const, label: "منتهي الصلاحية" };
    const daysLeft = differenceInDays(date, new Date());
    if (daysLeft <= 30)
      return { color: "warning" as const, label: `ينتهي خلال ${daysLeft} يوم` };
    return {
      color: "info" as const,
      label: `ينتهي خلال ${Math.floor(daysLeft / 30)} شهر`,
    };
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="error" variant="h6" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshCcw size={16} />}
          onClick={fetchData}
        >
          إعادة المحاولة
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Box
        sx={{
          mb: 4,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h4" fontWeight="bold">
          التقارير الإحصائية (لوحة المعلومات)
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshCcw size={18} />}
          onClick={fetchData}
        >
          تحديث البيانات
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Top Selling Products */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={2} sx={{ height: "100%", borderRadius: 2 }}>
            <CardHeader
              title="الأصناف الأكثر مبيعاً (آخر 30 يوم)"
              avatar={<TrendingUp color="#10b981" />}
              titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            />
            <CardContent sx={{ p: 0 }}>
              <List disablePadding>
                {bestSelling.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="لا توجد بيانات للفترة المحددة." />
                  </ListItem>
                ) : (
                  bestSelling.map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ListItem sx={{ py: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: "success.light",
                              color: "success.dark",
                              mr: 2,
                              ml: 2,
                              width: 32,
                              height: 32,
                            }}
                          >
                            {index + 1}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {product.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              التصنيف: {product.category_name} | المتبقي:{" "}
                              {product.current_stock}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "left", minWidth: 100 }}>
                            <Typography
                              variant="subtitle2"
                              color="success.main"
                              fontWeight="bold"
                            >
                              {formatNumber(product.total_quantity_sold)} مباع
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(product.total_revenue)}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                      {index < bestSelling.length - 1 && <Divider />}
                    </React.Fragment>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Stagnant Products */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={2} sx={{ height: "100%", borderRadius: 2 }}>
            <CardHeader
              title="الأصناف الراكدة (لا مبيعات منذ 3 أشهر)"
              avatar={<PackageX color="#6b7280" />}
              titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            />
            <CardContent sx={{ p: 0 }}>
              <List disablePadding>
                {stagnant.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="لا توجد أصناف راكدة." />
                  </ListItem>
                ) : (
                  stagnant.map((product, index) => (
                    <React.Fragment key={product.id}>
                      <ListItem sx={{ py: 2 }}>
                        <Box
                          sx={{
                            display: "flex",
                            width: "100%",
                            alignItems: "center",
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: "grey.200",
                              color: "grey.700",
                              mr: 2,
                              ml: 2,
                              width: 32,
                              height: 32,
                            }}
                          >
                            {index + 1}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {product.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              التصنيف: {product.category_name} | إجمالي مبيعاته
                              السابقة: {product.lifetime_sales}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "left" }}>
                            <Chip
                              label={`${product.stock_quantity} متوفر`}
                              size="small"
                              variant="outlined"
                              color="default"
                            />
                          </Box>
                        </Box>
                      </ListItem>
                      {index < stagnant.length - 1 && <Divider />}
                    </React.Fragment>
                  ))
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Expiring Products */}
        <Grid size={{ xs: 12 }}>
          <Card elevation={2} sx={{ borderRadius: 2 }}>
            <CardHeader
              title="الأصناف المقاربة على الانتهاء (خلال 6 أشهر)"
              avatar={<Clock color="#f59e0b" />}
              titleTypographyProps={{ variant: "h6", fontWeight: 600 }}
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "background.default",
              }}
            />
            <TableContainer>
              <Table size="small">
                <TableHead sx={{ bgcolor: "background.default" }}>
                  <TableRow>
                    <TableCell>الصنف</TableCell>
                    <TableCell>التصنيف</TableCell>
                    <TableCell align="center">المخزون المتوفر</TableCell>
                    <TableCell align="center">أقرب تاريخ انتهاء</TableCell>
                    <TableCell align="center">الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {expiring.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        لا توجد أصناف تنتهي صلاحيتها قريباً.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expiring.map((product) => {
                      const status = getExpiryStatus(
                        product.earliest_expiry_date,
                      );
                      return (
                        <TableRow key={product.id} hover>
                          <TableCell sx={{ fontWeight: 500 }}>
                            {product.name}
                          </TableCell>
                          <TableCell>{product.category_name}</TableCell>
                          <TableCell align="center">
                            {product.stock_quantity}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: "bold" }}>
                            {format(
                              new Date(product.earliest_expiry_date),
                              "dd MMMM yyyy",
                              { locale: ar },
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={status.label}
                              color={status.color}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsDashboardPage;
