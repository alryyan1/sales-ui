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
  Button,
} from "@mui/material";
import { TrendingUp, PackageX, RefreshCcw } from "lucide-react";
import reportService, {
  BestSellingProduct,
  StagnantProduct,
} from "../../services/reportService";
import { formatCurrency, formatNumber } from "../../constants";
import { useTranslation } from "react-i18next";

const ReportsDashboardPage: React.FC = () => {
  const { t } = useTranslation(["reports"]);
  const [loading, setLoading] = useState(true);
  const [bestSelling, setBestSelling] = useState<BestSellingProduct[]>([]);
  const [stagnant, setStagnant] = useState<StagnantProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bestSellingData, stagnantData] = await Promise.all([
        reportService.getBestSellingProducts(30, 10), // Last 30 days, top 10
        reportService.getStagnantProducts(3, 10), // No sales in 3 months, top 10
      ]);
      setBestSelling(bestSellingData);
      setStagnant(stagnantData);
    } catch (err: unknown) {
      console.error("Failed to load reports:", err);
      setError(t("reports:reportsDashboardPage.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
          {t("reports:reportsDashboardPage.retryButton")}
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
          {t("reports:reportsDashboardPage.title")}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshCcw size={18} />}
          onClick={fetchData}
        >
          {t("reports:reportsDashboardPage.refreshButton")}
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Top Selling Products */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card elevation={2} sx={{ height: "100%", borderRadius: 2 }}>
            <CardHeader
              title={t("reports:reportsDashboardPage.topSellingTitle")}
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
                    <ListItemText primary={t("reports:reportsDashboardPage.noDataForPeriod")} />
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
                              {t("reports:reportsDashboardPage.categoryLabel", { category: product.category_name, remaining: product.current_stock })}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "left", minWidth: 100 }}>
                            <Typography
                              variant="subtitle2"
                              color="success.main"
                              fontWeight="bold"
                            >
                              {formatNumber(product.total_quantity_sold)} {t("reports:reportsDashboardPage.soldSuffix")}
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
              title={t("reports:reportsDashboardPage.stagnantTitle")}
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
                    <ListItemText primary={t("reports:reportsDashboardPage.noStagnantItems")} />
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
                              {t("reports:reportsDashboardPage.categoryAndLifetimeSales", { category: product.category_name, sales: product.lifetime_sales })}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "left" }}>
                            <Chip
                              label={`${product.stock_quantity} ${t("reports:reportsDashboardPage.availableSuffix")}`}
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
      </Grid>
    </Box>
  );
};

export default ReportsDashboardPage;
