// src/pages/SuppliersPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  App as AntApp,
  Alert,
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Dropdown,
  Flex,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { MenuProps, TableProps } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import { getAntdThemeConfig } from "@/lib/antdTheme";
import {
  AlertCircle,
  Building2,
  Eye,
  FileDown,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";

import { formatNumber } from "@/constants";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

import supplierService, { Supplier, SupplierSummary } from "@/services/supplierService";
import exportService from "@/services/exportService";
import SupplierFormModal from "@/components/suppliers/SupplierFormModal";

const { Title, Text } = Typography;

function balanceColor(balance: number) {
  if (balance > 0) return "#dc2626";
  if (balance < 0) return "#16a34a";
  return undefined;
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation("suppliers");
  const { t: tCommon } = useTranslation("common");

  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [detailsSupplier, setDetailsSupplier] = useState<Supplier | null>(null);

  const [isPdfLoading, setIsPdfLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", page, debouncedSearch],
    queryFn: () => supplierService.getSuppliers(page, debouncedSearch),
    placeholderData: keepPreviousData,
  });

  const summaryQuery = useQuery({
    queryKey: ["suppliers-summary"],
    queryFn: () => supplierService.getSuppliersSummary(),
  });

  const summaryMap = useMemo(() => {
    const map = new Map<number, SupplierSummary>();
    summaryQuery.data?.forEach((s) => map.set(s.id, s));
    return map;
  }, [summaryQuery.data]);

  const overallTotals = useMemo(() => {
    if (!summaryQuery.data) return { debit: 0, credit: 0, balance: 0 };
    return summaryQuery.data.reduce(
      (acc, s) => ({
        debit: acc.debit + s.total_debit,
        credit: acc.credit + s.total_credit,
        balance: acc.balance + s.balance,
      }),
      { debit: 0, credit: 0, balance: 0 }
    );
  }, [summaryQuery.data]);

  const handleDownloadPdf = async () => {
    setIsPdfLoading(true);
    try {
      await exportService.exportSuppliersSummaryPdf();
    } finally {
      setIsPdfLoading(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => supplierService.deleteSupplier(id),
    onSuccess: () => {
      toast.success(t("deleteSuccess"));
      const isLastRowOnPage = suppliersQuery.data?.data.length === 1 && page > 1;
      setSupplierToDelete(null);
      if (isLastRowOnPage) {
        setPage((p) => p - 1);
      } else {
        queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      }
    },
    onError: (err) => {
      toast.error(t("failedToDeleteSupplier"), { description: supplierService.getErrorMessage(err) });
    },
  });

  const openCreateModal = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };
  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };
  const handleSaveSuccess = () => {
    closeModal();
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["suppliers-summary"] });
  };
  const confirmDelete = () => {
    if (supplierToDelete) deleteMutation.mutate(supplierToDelete.id);
  };

  const suppliers = suppliersQuery.data?.data ?? [];

  const summaryCards = [
    {
      key: "debit",
      label: t("totalDebitLabel"),
      value: overallTotals.debit,
      icon: TrendingUp,
      color: "#dc2626",
      bg: "rgba(220, 38, 38, 0.1)",
    },
    {
      key: "credit",
      label: t("totalCreditLabel"),
      value: overallTotals.credit,
      icon: TrendingDown,
      color: "#16a34a",
      bg: "rgba(22, 163, 74, 0.1)",
    },
    {
      key: "balance",
      label: t("netBalanceLabel"),
      value: overallTotals.balance,
      icon: Wallet,
      color: balanceColor(overallTotals.balance),
      bg: "rgba(99, 102, 241, 0.1)",
    },
  ];

  const getRowActions = (supplier: Supplier): MenuProps["items"] => [
    {
      key: "view",
      icon: <Eye size={14} />,
      label: t("viewDetails"),
      onClick: () => setDetailsSupplier(supplier),
    },
    {
      key: "ledger",
      icon: <FileText size={14} />,
      label: t("accountStatement"),
      onClick: () => navigate(`/suppliers/${supplier.id}/ledger`),
    },
    ...(supplier.is_client && supplier.client_id
      ? [
          {
            key: "sales-ledger",
            icon: <ShoppingCart size={14} />,
            label: t("salesStatement"),
            onClick: () => navigate(`/clients/${supplier.client_id}/ledger`),
          },
        ]
      : []),
    {
      key: "edit",
      icon: <Pencil size={14} />,
      label: tCommon("edit"),
      onClick: () => openEditModal(supplier),
    },
    { type: "divider" },
    {
      key: "delete",
      icon: <Trash2 size={14} />,
      label: tCommon("delete"),
      danger: true,
      onClick: () => setSupplierToDelete(supplier),
    },
  ];

  const columns: TableProps<Supplier>["columns"] = [
    {
      title: t("supplierColumn"),
      dataIndex: "name",
      key: "name",
      render: (_v, supplier) => (
        <Space size={10}>
          <Avatar style={{ backgroundColor: "rgba(99, 102, 241, 0.15)", color: "#6366f1", fontWeight: 600 }}>
            {initials(supplier.name)}
          </Avatar>
          <Space size={6}>
            <Text strong>{supplier.name}</Text>
            {supplier.is_client && <Tag color="processing">{t("clientBadge")}</Tag>}
          </Space>
        </Space>
      ),
    },
    {
      title: t("contactInfoColumn"),
      key: "contact",
      render: (_v, supplier) => (
        <Space direction="vertical" size={2}>
          {supplier.phone && (
            <Space size={6}>
              <Phone size={12} color="#16a34a" />
              <Text style={{ fontSize: 12 }} type="secondary" dir="ltr">
                {supplier.phone}
              </Text>
            </Space>
          )}
          {supplier.email && (
            <Space size={6}>
              <Mail size={12} color="#6366f1" />
              <Text style={{ fontSize: 12, maxWidth: 180 }} type="secondary" ellipsis>
                {supplier.email}
              </Text>
            </Space>
          )}
          {!supplier.phone && !supplier.email && <Text type="secondary">—</Text>}
        </Space>
      ),
    },
    {
      title: t("debitColumn"),
      key: "debit",
      align: "right",
      width: 130,
      render: (_v, supplier) => (
        <Text style={{ color: "#dc2626" }}>
          {formatNumber(summaryMap.get(supplier.id)?.total_debit ?? 0, 2)}
        </Text>
      ),
    },
    {
      title: t("creditColumn"),
      key: "credit",
      align: "right",
      width: 130,
      render: (_v, supplier) => (
        <Text style={{ color: "#16a34a" }}>
          {formatNumber(summaryMap.get(supplier.id)?.total_credit ?? 0, 2)}
        </Text>
      ),
    },
    {
      title: t("balance"),
      key: "balance",
      align: "right",
      width: 130,
      render: (_v, supplier) => {
        const balance = summaryMap.get(supplier.id)?.balance ?? 0;
        return (
          <Text strong style={{ color: balanceColor(balance) }}>
            {formatNumber(balance, 2)}
          </Text>
        );
      },
    },
    {
      title: <span style={{ visibility: "hidden" }}>{t("actionsColumn")}</span>,
      key: "actions",
      width: 90,
      align: "center",
      render: (_v, supplier) => (
        <Space size={4} onClick={(e) => e.stopPropagation()}>
          <Tooltip title={t("viewAction")}>
            <Button
              type="text"
              size="small"
              icon={<Eye size={15} />}
              onClick={() => setDetailsSupplier(supplier)}
            />
          </Tooltip>
          <Dropdown menu={{ items: getRowActions(supplier) }} trigger={["click"]}>
            <Button type="text" size="small" icon={<MoreHorizontal size={15} />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const emptyNode = (
    <Flex vertical align="center" gap={8} style={{ padding: "48px 0" }}>
      <Building2 size={36} color="rgba(0,0,0,0.25)" />
      {debouncedSearch ? (
        <Flex vertical align="center" gap={4}>
          <Text strong>{t("noResultsFor", { term: debouncedSearch })}</Text>
          <Button type="link" size="small" onClick={() => setSearchTerm("")}>
            {t("clearSearchAria")}
          </Button>
        </Flex>
      ) : (
        <Flex vertical align="center" gap={4}>
          <Text strong>{t("noSuppliersYet")}</Text>
          <Text type="secondary">{t("addFirstSupplierHint")}</Text>
        </Flex>
      )}
      {!debouncedSearch && (
        <Button type="primary" icon={<Plus size={14} />} onClick={openCreateModal}>
          {t("addFirstSupplierButton")}
        </Button>
      )}
    </Flex>
  );

  const detailsSummary = detailsSupplier ? summaryMap.get(detailsSupplier.id) : undefined;

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={getAntdThemeConfig(resolvedTheme)}
    >
      <AntApp>
        <div dir={direction} style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <Flex align="flex-start" justify="space-between" gap={16} wrap>
            <Space align="start" size={12}>
              <Flex
                align="center"
                justify="center"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: "rgba(99, 102, 241, 0.1)",
                  color: "#6366f1",
                  flexShrink: 0,
                }}
              >
                <Building2 size={20} />
              </Flex>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {t("pageHeading")}
                </Title>
                <Text type="secondary">{t("pageSubtitle")}</Text>
              </div>
            </Space>
            <Space wrap>
              <Button
                icon={isPdfLoading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                disabled={isPdfLoading || summaryQuery.isLoading || !summaryQuery.data}
                onClick={handleDownloadPdf}
              >
                {t("exportPdfButton")}
              </Button>
              <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
                {t("newSupplierButton")}
              </Button>
            </Space>
          </Flex>

          {/* Financial summary */}
          <Flex gap={12} wrap>
            {summaryCards.map(({ key, label, value, icon: Icon, color, bg }) => (
              <Card key={key} size="small" style={{ flex: "1 1 220px" }}>
                <Space size={12} align="center">
                  <Flex
                    align="center"
                    justify="center"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      backgroundColor: bg,
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} />
                  </Flex>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {label}
                    </Text>
                    <div>
                      {summaryQuery.isLoading ? (
                        <Text type="secondary">…</Text>
                      ) : (
                        <Text strong style={{ fontSize: 16, color }}>
                          {formatNumber(value)}
                        </Text>
                      )}
                    </div>
                  </div>
                </Space>
              </Card>
            ))}
          </Flex>

          {/* Suppliers list */}
          <Card
            size="small"
            title={
              <div>
                <div>{t("suppliersListTitle")}</div>
                <Text type="secondary" style={{ fontSize: 12, fontWeight: "normal" }}>
                  {!suppliersQuery.isLoading && !suppliersQuery.isError
                    ? t("supplierCountLabel", { count: suppliersQuery.data?.total ?? suppliers.length })
                    : t("searchAndManageDesc")}
                </Text>
              </div>
            }
            extra={
              <Input
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("searchPlaceholderShort")}
                prefix={<Search size={14} style={{ opacity: 0.5 }} />}
                style={{ width: 240 }}
              />
            }
            styles={{ body: { padding: 0 } }}
          >
            {suppliersQuery.isError ? (
              <Alert
                type="error"
                showIcon
                icon={<AlertCircle size={16} />}
                message={t("loadErrorTitle")}
                description={supplierService.getErrorMessage(suppliersQuery.error)}
                action={
                  <Button size="small" onClick={() => suppliersQuery.refetch()}>
                    {tCommon("retry")}
                  </Button>
                }
                style={{ margin: 16 }}
              />
            ) : (
              <Table<Supplier>
                rowKey="id"
                columns={columns}
                dataSource={suppliers}
                loading={suppliersQuery.isLoading}
                locale={{ emptyText: emptyNode }}
                onRow={(supplier) => ({
                  onClick: () => setDetailsSupplier(supplier),
                  style: {
                    cursor: "pointer",
                    backgroundColor: supplier.is_client ? "rgba(99, 102, 241, 0.04)" : undefined,
                  },
                })}
                pagination={{
                  current: page,
                  pageSize: suppliersQuery.data?.per_page ?? 15,
                  total: suppliersQuery.data?.total ?? suppliers.length,
                  onChange: (p) => setPage(p),
                  showSizeChanger: false,
                }}
              />
            )}
          </Card>
        </div>

        {/* Create / edit supplier */}
        <SupplierFormModal
          isOpen={isModalOpen}
          onClose={closeModal}
          supplierToEdit={editingSupplier}
          onSaveSuccess={handleSaveSuccess}
        />

        {/* Quick-view details */}
        <Modal
          open={!!detailsSupplier}
          onCancel={() => setDetailsSupplier(null)}
          footer={null}
          title={
            detailsSupplier && (
              <Space size={10}>
                <Avatar style={{ backgroundColor: "#6366f1" }}>{initials(detailsSupplier.name)}</Avatar>
                <div>
                  <div>{detailsSupplier.name}</div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: "normal" }}>
                    {t("supplierDataSubtitle")}
                  </Text>
                </div>
              </Space>
            )
          }
        >
          {detailsSupplier && (
            <Flex vertical gap={16}>
              <Flex gap={8}>
                <Card size="small" style={{ flex: 1, textAlign: "center", backgroundColor: "rgba(220, 38, 38, 0.05)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("debitColumn")}
                  </Text>
                  <div>
                    <Text strong style={{ color: "#dc2626", fontSize: 13 }}>
                      {formatNumber(detailsSummary?.total_debit ?? 0, 2)}
                    </Text>
                  </div>
                </Card>
                <Card size="small" style={{ flex: 1, textAlign: "center", backgroundColor: "rgba(22, 163, 74, 0.05)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("creditColumn")}
                  </Text>
                  <div>
                    <Text strong style={{ color: "#16a34a", fontSize: 13 }}>
                      {formatNumber(detailsSummary?.total_credit ?? 0, 2)}
                    </Text>
                  </div>
                </Card>
                <Card size="small" style={{ flex: 1, textAlign: "center", backgroundColor: "rgba(99, 102, 241, 0.05)" }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("balance")}
                  </Text>
                  <div>
                    <Text strong style={{ color: balanceColor(detailsSummary?.balance ?? 0), fontSize: 13 }}>
                      {formatNumber(detailsSummary?.balance ?? 0, 2)}
                    </Text>
                  </div>
                </Card>
              </Flex>

              <Descriptions column={1} size="small" bordered>
                {detailsSupplier.contact_person && (
                  <Descriptions.Item
                    label={
                      <Space size={6}>
                        <User size={13} />
                        {t("contactPersonShort")}
                      </Space>
                    }
                  >
                    {detailsSupplier.contact_person}
                  </Descriptions.Item>
                )}
                {detailsSupplier.phone && (
                  <Descriptions.Item
                    label={
                      <Space size={6}>
                        <Phone size={13} color="#16a34a" />
                        {t("phoneShort")}
                      </Space>
                    }
                  >
                    <span dir="ltr">{detailsSupplier.phone}</span>
                  </Descriptions.Item>
                )}
                {detailsSupplier.email && (
                  <Descriptions.Item
                    label={
                      <Space size={6}>
                        <Mail size={13} color="#6366f1" />
                        {t("email")}
                      </Space>
                    }
                  >
                    {detailsSupplier.email}
                  </Descriptions.Item>
                )}
                {detailsSupplier.address && (
                  <Descriptions.Item
                    label={
                      <Space size={6}>
                        <MapPin size={13} />
                        {t("address")}
                      </Space>
                    }
                  >
                    {detailsSupplier.address}
                  </Descriptions.Item>
                )}
              </Descriptions>

              <Flex gap={8}>
                <Button
                  type="primary"
                  icon={<FileText size={14} />}
                  style={{ flex: 1 }}
                  onClick={() => {
                    navigate(`/suppliers/${detailsSupplier.id}/ledger`);
                    setDetailsSupplier(null);
                  }}
                >
                  {t("accountStatement")}
                </Button>
                <Button
                  icon={<Pencil size={14} />}
                  style={{ flex: 1 }}
                  onClick={() => {
                    openEditModal(detailsSupplier);
                    setDetailsSupplier(null);
                  }}
                >
                  {tCommon("edit")}
                </Button>
              </Flex>
            </Flex>
          )}
        </Modal>

        {/* Delete confirmation */}
        <Modal
          open={!!supplierToDelete}
          onCancel={() => !deleteMutation.isPending && setSupplierToDelete(null)}
          title={t("deleteSupplierConfirmTitle", { name: supplierToDelete?.name })}
          footer={[
            <Button key="cancel" disabled={deleteMutation.isPending} onClick={() => setSupplierToDelete(null)}>
              {tCommon("cancel")}
            </Button>,
            <Button
              key="delete"
              danger
              type="primary"
              loading={deleteMutation.isPending}
              icon={!deleteMutation.isPending && <Trash2 size={14} />}
              onClick={confirmDelete}
            >
              {t("deletePermanently")}
            </Button>,
          ]}
        >
          <Text type="secondary">{t("actionCannotBeUndoneFull")}</Text>
        </Modal>
      </AntApp>
    </ConfigProvider>
  );
};

export default SuppliersPage;
