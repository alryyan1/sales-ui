import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Container,
  Paper,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Grid,
} from "@mui/material";
import {
  Search as SearchIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  AccountBalance as TaxIcon,
  LocalShipping as CustomsIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import purchaseService, { Purchase } from "../../services/purchaseService";
import { formatCurrency } from "../../constants";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tax-customs-tabpanel-${index}`}
      aria-labelledby={`tax-customs-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const TaxCustomsManagementPage: React.FC = () => {
  const { t } = useTranslation(["purchases", "common"]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabValue, setTabValue] = useState(0);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(
    null,
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Form state
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [customsAmount, setCustomsAmount] = useState<number>(0);

  // Feedback state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fetchPurchases = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await purchaseService.getPurchases(
        1,
        searchQuery ? `reference_number=${searchQuery}` : "",
      );
      setPurchases(response.data);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      setSnackbar({
        open: true,
        message: t("purchases:taxCustoms.loadFailed"),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleOpenEdit = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setTaxAmount(Number(purchase.tax_amount) || 0);
    setCustomsAmount(Number(purchase.customs_amount) || 0);
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPurchase) return;

    try {
      await purchaseService.updatePurchase(selectedPurchase.id, {
        items: [], // Assume backend handles header-only updates if items is empty or omitted
        tax_amount: taxAmount,
        customs_amount: customsAmount,
      });
      setSnackbar({
        open: true,
        message: t("purchases:taxCustoms.saveSuccess"),
        severity: "success",
      });
      setEditDialogOpen(false);
      fetchPurchases();
    } catch (error) {
      console.error("Error saving tax/customs:", error);
      setSnackbar({
        open: true,
        message: t("purchases:taxCustoms.saveFailed"),
        severity: "error",
      });
    }
  };

  const handleDownloadPdf = async (purchaseId: number, detailed: boolean) => {
    try {
      await purchaseService.exportTaxPdf(purchaseId, detailed);
      setSnackbar({
        open: true,
        message: t("purchases:taxCustoms.downloadStarted"),
        severity: "success",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      setSnackbar({
        open: true,
        message: t("purchases:taxCustoms.exportFailed"),
        severity: "error",
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography
          variant="h4"
          gutterBottom
          align="right"
          sx={{ mb: 3, fontWeight: "bold", color: "primary.main" }}
        >
          {t("purchases:taxCustoms.pageTitle")}
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="tax and customs tabs"
            variant="fullWidth"
          >
            <Tab
              icon={<TaxIcon />}
              label={t("purchases:taxCustoms.taxesTab")}
              id="tax-customs-tab-0"
              aria-controls="tax-customs-tabpanel-0"
            />
            <Tab
              icon={<CustomsIcon />}
              label={t("purchases:taxCustoms.customsTab")}
              id="tax-customs-tab-1"
              aria-controls="tax-customs-tabpanel-1"
            />
          </Tabs>
        </Box>

        <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
          <TextField
            fullWidth
            label={t("purchases:taxCustoms.searchByReference")}
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              endAdornment: <SearchIcon />,
            }}
          />
          <Button
            variant="contained"
            onClick={fetchPurchases}
            startIcon={<SearchIcon />}
          >
            {t("purchases:taxCustoms.searchButton")}
          </Button>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom align="right">
            {t("purchases:taxCustoms.taxRecordsTitle")}
          </Typography>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell align="right">{t("purchases:taxCustoms.colPurchaseNumber")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colSupplier")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colDate")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colTotalAmount")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colTax")}</TableCell>
                  <TableCell align="center">{t("purchases:taxCustoms.colActions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t("purchases:taxCustoms.noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell align="right">#{purchase.id}</TableCell>
                      <TableCell align="right">
                        {purchase.supplier_name}
                      </TableCell>
                      <TableCell align="right">
                        {purchase.purchase_date}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(purchase.total_amount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(purchase.tax_amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={t("purchases:taxCustoms.editTooltip")}>
                          <IconButton
                            onClick={() => handleOpenEdit(purchase)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("purchases:taxCustoms.downloadSummaryPdfTooltip")}>
                          <IconButton
                            onClick={() =>
                              handleDownloadPdf(purchase.id, false)
                            }
                            color="secondary"
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("purchases:taxCustoms.downloadDetailedPdfTooltip")}>
                          <IconButton
                            onClick={() => handleDownloadPdf(purchase.id, true)}
                            color="info"
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom align="right">
            {t("purchases:taxCustoms.customsRecordsTitle")}
          </Typography>
          <TableContainer>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell align="right">{t("purchases:taxCustoms.colPurchaseNumber")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colSupplier")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colDate")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colTotalAmount")}</TableCell>
                  <TableCell align="right">{t("purchases:taxCustoms.colCustoms")}</TableCell>
                  <TableCell align="center">{t("purchases:taxCustoms.colActions")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {t("purchases:taxCustoms.noRecords")}
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell align="right">#{purchase.id}</TableCell>
                      <TableCell align="right">
                        {purchase.supplier_name}
                      </TableCell>
                      <TableCell align="right">
                        {purchase.purchase_date}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(purchase.total_amount)}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(purchase.customs_amount)}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={t("purchases:taxCustoms.editTooltip")}>
                          <IconButton
                            onClick={() => handleOpenEdit(purchase)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t("purchases:taxCustoms.downloadPdfTooltip")}>
                          <IconButton
                            onClick={() => handleDownloadPdf(purchase.id, true)}
                            color="secondary"
                          >
                            <PdfIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle align="right">
          {t("purchases:taxCustoms.editDialogTitle", { id: selectedPurchase?.id })}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("purchases:taxCustoms.taxAmountLabel")}
                type="number"
                value={taxAmount}
                onChange={(e) => setTaxAmount(Number(e.target.value))}
                inputProps={{ step: 0.001 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t("purchases:taxCustoms.customsAmountLabel")}
                type="number"
                value={customsAmount}
                onChange={(e) => setCustomsAmount(Number(e.target.value))}
                inputProps={{ step: 0.001 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>{t("common:cancel")}</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
          >
            {t("common:save")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TaxCustomsManagementPage;
