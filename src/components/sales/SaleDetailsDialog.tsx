// src/components/sales/SaleDetailsDialog.tsx
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Alert,
  App as AntApp,
  Button,
  ConfigProvider,
  Descriptions,
  Dropdown,
  Modal,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import {
  AlertCircle,
  Building2,
  Calendar,
  Landmark,
  Loader2,
  Printer,
  RotateCcw,
  Trash2,
  User,
} from "lucide-react";
import { getAntdThemeConfig } from "@/lib/antdTheme";

import { PdfViewerDialog } from "@/components/common/PdfViewerDialog";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useAuthorization } from "@/hooks/useAuthorization";
import { useLanguage } from "@/context/LanguageContext";
import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import apiClient from "@/lib/axios";
import { getSaleStatus, translatePaymentMethod, translateSaleStatus } from "@/lib/saleStatus";

import saleService, { SaleItem } from "@/services/saleService";

const { Text, Title } = Typography;

interface SaleDetailsDialogProps {
  saleId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
}

const STATUS_TAG_COLOR: Record<string, string> = {
  success: "green",
  warning: "orange",
  destructive: "red",
  secondary: "default",
  outline: "blue",
};

export function SaleDetailsDialog({ saleId, open, onOpenChange, onChanged }: SaleDetailsDialogProps) {
  const queryClient = useQueryClient();
  const formatCurrency = useFormatCurrency();
  const { hasPermission } = useAuthorization();
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { getSetting } = useSettings();
  const { t } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");
  const canDelete = hasPermission("حذف فاتورة");
  const currencyCode = getSetting("currency_code", "SDG");
  const usdConversionEnabled = Boolean(getSetting("usd_conversion_enabled", true));
  const showA4CurrencyOptions = currencyCode === "SDG" && usdConversionEnabled;

  const [printingKind, setPrintingKind] = useState<"thermal" | "a4" | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const saleQuery = useQuery({
    queryKey: ["sale-detail", saleId],
    queryFn: () => saleService.getSale(saleId as number),
    enabled: open && saleId != null,
  });

  const sale = saleQuery.data;
  const status = sale ? getSaleStatus(sale) : null;

  const items = sale?.items ?? [];
  const subtotal = sale
    ? items.reduce(
        (sum, item) => sum + Number(item.total_price ?? Number(item.unit_price) * item.quantity),
        0
      )
    : 0;
  const discount = Number(sale?.discount_amount ?? 0);
  const total = Number(sale?.total_amount ?? subtotal);
  const paid = Number(sale?.paid_amount ?? 0);
  const due = Number(sale?.due_amount ?? Math.max(0, total - paid));

  const returnedItems = items.filter((item) => Number(item.returned_quantity ?? 0) > 0);
  const hasReturns = Boolean(sale?.is_returned) || returnedItems.length > 0;
  const totalReturnedAmount = Number(sale?.total_returned_amount ?? 0);

  const handlePrint = async (kind: "thermal" | "a4", currency: "local" | "usd" = "local") => {
    if (!sale) return;
    setPrintingKind(kind);
    try {
      const path =
        kind === "thermal" ? `/sales/${sale.id}/thermal-invoice-pdf` : `/sales/${sale.id}/a4-invoice-pdf/view`;
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (kind === "a4" && currency === "usd") params.set("currency", "usd");
      const response = await apiClient.get(`${path}?${params.toString()}`, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      setPdfUrl(window.URL.createObjectURL(blob));
      setPdfDialogOpen(true);
    } catch {
      toast.error(t("failedToLoadSale"));
    } finally {
      setPrintingKind(null);
    }
  };

  const handleClosePdfDialog = () => {
    setPdfDialogOpen(false);
    if (pdfUrl) {
      window.URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleDelete = async () => {
    if (!sale) return;
    setIsDeleting(true);
    try {
      await saleService.deleteSale(sale.id);
      toast.success(t("saleDeletedSuccessfully"));
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["sales-list"] });
      onChanged?.();
    } catch (err) {
      toast.error(t("failedToDeleteSale"), { description: saleService.getErrorMessage(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportToFinance = async () => {
    if (!sale) return;
    setIsExporting(true);
    try {
      await saleService.exportToFinance(sale.id);
      toast.success(t("journalEntrySent"));
      queryClient.invalidateQueries({ queryKey: ["sale-detail", sale.id] });
    } catch (err) {
      toast.error(t("journalExportFailed"), { description: saleService.getErrorMessage(err) });
    } finally {
      setIsExporting(false);
    }
  };

  const itemColumns: TableProps<SaleItem>["columns"] = [
    {
      title: t("product"),
      key: "product",
      render: (_v, item) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontWeight: 500 }}>{item.product_name ?? t("productHash", { id: item.product_id })}</Text>
          {item.product_sku && (
            <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
              {item.product_sku}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t("quantity"),
      dataIndex: "quantity",
      key: "quantity",
      align: "center",
      width: 70,
    },
    {
      title: t("priceColumn"),
      dataIndex: "unit_price",
      key: "unit_price",
      align: "right",
      width: 100,
      render: (v) => formatCurrency(v),
    },
    {
      title: t("costColumn"),
      key: "cost",
      align: "right",
      width: 100,
      render: (_v, item) => (
        <Text type="secondary">{formatCurrency(item.resolved_cost_price ?? item.cost_price_at_sale)}</Text>
      ),
    },
    {
      title: t("totalColumn"),
      key: "total",
      align: "right",
      width: 110,
      render: (_v, item) => (
        <Text strong>{formatCurrency(Number(item.total_price ?? Number(item.unit_price) * item.quantity))}</Text>
      ),
    },
    {
      title: t("returnedColumn"),
      key: "returned",
      align: "center",
      width: 90,
      render: (_v, item) => {
        const qty = Number(item.returned_quantity ?? 0);
        return qty > 0 ? <Tag color="red">-{qty}</Tag> : <Text type="secondary">—</Text>;
      },
    },
  ];

  const footer = sale ? (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
      <Button
        icon={printingKind === "thermal" ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
        disabled={!!printingKind}
        onClick={() => handlePrint("thermal")}
      >
        {t("thermalReceiptTitle")}
      </Button>

      {showA4CurrencyOptions ? (
        <Dropdown
          menu={{
            items: [
              { key: "local", label: t("a4InvoiceLocalOption"), onClick: () => handlePrint("a4", "local") },
              { key: "usd", label: t("a4InvoiceUsdOption"), onClick: () => handlePrint("a4", "usd") },
            ],
          }}
        >
          <Button
            icon={printingKind === "a4" ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            disabled={!!printingKind}
          >
            {t("a4InvoiceButton")}
          </Button>
        </Dropdown>
      ) : (
        <Button
          icon={printingKind === "a4" ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
          disabled={!!printingKind}
          onClick={() => handlePrint("a4")}
        >
          {t("a4InvoiceButton")}
        </Button>
      )}

      <Button
        icon={isExporting ? <Loader2 size={14} className="animate-spin" /> : <Landmark size={14} />}
        disabled={isExporting}
        onClick={handleExportToFinance}
      >
        {sale.finance_exported_at ? t("reExportFinance") : t("exportFinance")}
      </Button>

      <div style={{ flex: 1 }} />

      {canDelete && (sale.payments?.length ?? 0) === 0 && (
        <Button danger icon={<Trash2 size={14} />} onClick={() => setConfirmDeleteOpen(true)}>
          {tCommon("delete")}
        </Button>
      )}
    </div>
  ) : null;

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={getAntdThemeConfig(resolvedTheme)}
    >
      <AntApp>
        <Modal
          open={open}
          onCancel={() => onOpenChange(false)}
          width={760}
          destroyOnHidden
          styles={{ body: { maxHeight: "70vh", overflowY: "auto", paddingTop: 4 } }}
          title={
            sale ? (
              <Space direction="vertical" size={2}>
                <Space size={8} wrap>
                  <Title level={5} style={{ margin: 0 }}>
                    {t("invoiceHash", { id: sale.number ?? sale.id })}
                  </Title>
                  {status && <Tag color={STATUS_TAG_COLOR[status.variant]}>{translateSaleStatus(t, status.kind)}</Tag>}
                  {hasReturns && (
                    <Tag color="volcano" icon={<RotateCcw size={11} style={{ marginInlineEnd: 4 }} />}>
                      {t("hasReturns")}
                    </Tag>
                  )}
                </Space>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                  {format(new Date(sale.created_at), "dd MMM yyyy, HH:mm")}
                </Text>
              </Space>
            ) : (
              t("invoiceDetailsTitle")
            )
          }
          footer={footer}
        >
          {saleQuery.isLoading && <Skeleton active paragraph={{ rows: 8 }} />}

          {saleQuery.isError && (
            <Alert
              type="error"
              showIcon
              icon={<AlertCircle size={16} />}
              message={t("loadSaleDataError")}
              action={
                <Button size="small" onClick={() => saleQuery.refetch()}>
                  {tCommon("retry")}
                </Button>
              }
            />
          )}

          {sale && (
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              {/* Sale info */}
              <Descriptions column={2} size="small" colon={false}>
                <Descriptions.Item
                  label={
                    <Space size={4}>
                      <User size={13} />
                      {t("client")}
                    </Space>
                  }
                >
                  {sale.client_id ? (
                    <a href={`#/clients/${sale.client_id}/ledger`}>
                      {sale.client_name ?? t("clientHash", { id: sale.client_id })}
                    </a>
                  ) : (
                    t("cashClient")
                  )}
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <Space size={4}>
                      <User size={13} />
                      {t("cashierColumn")}
                    </Space>
                  }
                >
                  {sale.user_name ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <Space size={4}>
                      <Building2 size={13} />
                      {t("warehouseLabel")}
                    </Space>
                  }
                >
                  {sale.warehouse?.name ?? "—"}
                </Descriptions.Item>
                <Descriptions.Item
                  label={
                    <Space size={4}>
                      <Calendar size={13} />
                      {t("saleDate")}
                    </Space>
                  }
                >
                  {sale.sale_date}
                </Descriptions.Item>
                {sale.shift_id != null && (
                  <Descriptions.Item label={t("shiftLabel")}>#{sale.shift_id}</Descriptions.Item>
                )}
                {sale.notes && (
                  <Descriptions.Item label={t("notes")} span={2}>
                    <span style={{ whiteSpace: "pre-wrap" }}>{sale.notes}</span>
                  </Descriptions.Item>
                )}
              </Descriptions>

              {/* Returns banner */}
              {hasReturns && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<RotateCcw size={16} />}
                  message={t("hasReturns")}
                  description={
                    returnedItems.length > 0
                      ? `${t("itemsCountHeading", { count: returnedItems.length })} · ${t(
                          "returnedColumn"
                        )}: ${formatCurrency(totalReturnedAmount)}`
                      : undefined
                  }
                />
              )}

              {/* Items */}
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  {t("itemsCountHeading", { count: items.length })}
                </Text>
                <ConfigProvider direction="ltr">
                  <div dir="ltr">
                    <Table<SaleItem>
                      rowKey={(item) => item.id ?? `${item.product_id}-${item.quantity}`}
                      size="small"
                      columns={itemColumns}
                      dataSource={items}
                      pagination={false}
                      scroll={{ x: 640 }}
                      locale={{ emptyText: t("noItems") }}
                      onRow={(item) =>
                        Number(item.returned_quantity ?? 0) > 0
                          ? { style: { backgroundColor: "rgba(255,77,79,0.06)" } }
                          : {}
                      }
                    />
                  </div>
                </ConfigProvider>
              </div>

              {/* Summary */}
              <div
                style={{
                  borderRadius: 8,
                  padding: "12px 16px",
                  background: "rgba(128,128,128,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <SummaryRow label={t("subtotalLabel")} value={formatCurrency(subtotal)} />
                {discount > 0 && (
                  <SummaryRow label={t("discount")} value={`- ${formatCurrency(discount)}`} valueColor="#dc2626" />
                )}
                <div style={{ borderTop: "1px solid rgba(128,128,128,0.2)", margin: "2px 0" }} />
                <SummaryRow label={t("totalColumn")} value={formatCurrency(total)} strong valueColor="#1677ff" />
                <SummaryRow label={t("paidColumn")} value={formatCurrency(paid)} valueColor="#16a34a" />
                {due > 0 && <SummaryRow label={t("dueColumn")} value={formatCurrency(due)} strong valueColor="#dc2626" />}
              </div>

              {/* Payments */}
              <div>
                <Text strong style={{ display: "block", marginBottom: 8 }}>
                  {t("paymentsMadeTitle")}
                </Text>
                {(sale.payments ?? []).length === 0 ? (
                  <div
                    style={{
                      border: "1px dashed rgba(128,128,128,0.3)",
                      borderRadius: 8,
                      padding: "16px 0",
                      textAlign: "center",
                    }}
                  >
                    <Text type="secondary">{t("noPaymentsRecorded")}</Text>
                  </div>
                ) : (
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    {(sale.payments ?? []).map((payment) => (
                      <div
                        key={payment.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          border: "1px solid rgba(128,128,128,0.2)",
                          borderRadius: 8,
                          padding: "8px 12px",
                        }}
                      >
                        <Space size={8}>
                          <Tag>{translatePaymentMethod(t, payment.method)}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {payment.payment_date}
                          </Text>
                          {payment.reference_number && (
                            <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
                              #{payment.reference_number}
                            </Text>
                          )}
                        </Space>
                        <Text strong>{formatCurrency(payment.amount)}</Text>
                      </div>
                    ))}
                  </Space>
                )}
              </div>
            </Space>
          )}
        </Modal>

        <Modal
          open={confirmDeleteOpen}
          onCancel={() => !isDeleting && setConfirmDeleteOpen(false)}
          title={t("deleteSaleConfirmTitle", { id: sale?.number ?? sale?.id })}
          okText={t("deletePermanently")}
          okType="danger"
          okButtonProps={{ loading: isDeleting, icon: <Trash2 size={14} /> }}
          cancelText={tCommon("cancel")}
          cancelButtonProps={{ disabled: isDeleting }}
          onOk={handleDelete}
        >
          {t("actionCannotBeUndoneFull")}
        </Modal>
      </AntApp>

      {pdfUrl && (
        <PdfViewerDialog isOpen={pdfDialogOpen} onClose={handleClosePdfDialog} pdfUrl={pdfUrl} title={t("saleInvoiceTitle")} />
      )}
    </ConfigProvider>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  valueColor,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueColor?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Text type="secondary" style={{ fontSize: strong ? 14 : 13 }}>
        {label}
      </Text>
      <Text strong={strong} style={{ fontSize: strong ? 15 : 13, color: valueColor }}>
        {value}
      </Text>
    </div>
  );
}
