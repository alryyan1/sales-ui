// src/pages/sales/SalesReturnsListPage.tsx
import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import dayjs, { Dayjs } from "dayjs";
import {
  App as AntApp,
  Button,
  Card,
  ConfigProvider,
  DatePicker,
  Flex,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import arEG from "antd/locale/ar_EG";
import enUS from "antd/locale/en_US";
import "dayjs/locale/ar";
import { getAntdThemeConfig } from "@/lib/antdTheme";
import {
  ArrowLeft,
  ArrowRight,
  DollarSign,
  PackageX,
  RefreshCw,
} from "lucide-react";

import saleReturnService, { SaleReturn } from "@/services/saleReturnService";
import apiClient from "@/lib/axios";
import { useShifts } from "@/hooks/useShifts";
import { useFormatCurrency } from "@/hooks/useFormatCurrency";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const PER_PAGE = 20;

const METHOD_COLORS: Record<string, string> = {
  cash: "green",
  bankak: "blue",
  fawry: "gold",
  ocash: "default",
  bank_transfer: "blue",
  card: "geekblue",
};

const returnItemsTotal = (r: SaleReturn) =>
  r.items?.reduce((acc, item) => acc + Number(item.price) * Number(item.quantity), 0) ?? 0;

const SalesReturnsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { direction, language } = useLanguage();
  const { resolvedTheme } = useTheme();
  const formatCurrency = useFormatCurrency();
  const { t } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");

  const METHOD_LABELS: Record<string, string> = {
    cash: t("paymentMethodCash"),
    bankak: t("paymentMethodBankak"),
    fawry: t("paymentMethodFawry"),
    ocash: t("paymentMethodOcash"),
    bank_transfer: t("paymentMethodBankTransfer"),
    card: t("paymentMethodCard"),
  };

  const today = dayjs().format("YYYY-MM-DD");
  const startDate = searchParams.get("startDate") || today;
  const endDate = searchParams.get("endDate") || today;
  const shiftId = searchParams.get("shiftId") || "";
  const userId = searchParams.get("userId") || "";
  const page = Number(searchParams.get("page") || "1");

  const shiftsQuery = useShifts();
  const usersQuery = useQuery({
    queryKey: ["users-list-filters"],
    queryFn: async () => {
      const res = await apiClient.get<{ data: { id: number; name: string }[] }>("/users/list");
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: returnsResult,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["sales-returns-list", startDate, endDate, shiftId, userId, page],
    queryFn: () =>
      saleReturnService.getSaleReturns({
        start_date: startDate,
        end_date: endDate,
        shift_id: shiftId ? Number(shiftId) : null,
        user_id: userId ? Number(userId) : null,
        page,
        per_page: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
  });

  const returns: SaleReturn[] = returnsResult?.data ?? [];
  const meta = returnsResult?.meta ?? { current_page: page, last_page: 1, total: returns.length };

  const pageTotal = useMemo(
    () => returns.reduce((sum, r) => sum + returnItemsTotal(r), 0),
    [returns],
  );

  const patchParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const handleRangeChange = (values: null | (Dayjs | null)[]) => {
    patchParams({
      startDate: values?.[0] ? values[0].format("YYYY-MM-DD") : null,
      endDate: values?.[1] ? values[1].format("YYYY-MM-DD") : null,
      page: "1",
    });
  };

  const resetFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters =
    !!shiftId || !!userId || startDate !== today || endDate !== today;

  const columns: TableProps<SaleReturn>["columns"] = [
    {
      title: t("rowNumberColumn"),
      key: "row",
      width: 56,
      align: "center",
      render: (_v, _r, index) => (
        <Text type="secondary">{(page - 1) * PER_PAGE + index + 1}</Text>
      ),
    },
    {
      title: t("date"),
      dataIndex: "created_at",
      key: "date",
      width: 150,
      render: (value: string | null) =>
        value ? (
          <Space direction="vertical" size={0}>
            <Text>{dayjs(value).format("YYYY-MM-DD")}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(value).format("HH:mm")}
            </Text>
          </Space>
        ) : (
          "—"
        ),
    },
    {
      title: t("invoiceHashColumn"),
      dataIndex: "sale_id",
      key: "sale_id",
      width: 100,
      render: (saleId: number | null) =>
        saleId != null ? <Tag>{`#${saleId}`}</Tag> : "—",
    },
    {
      title: t("phoneNumberColumn"),
      dataIndex: "phone_number",
      key: "phone_number",
      width: 130,
      render: (phone: string | null) => <span dir="ltr">{phone ?? "—"}</span>,
    },
    {
      title: t("user"),
      key: "user",
      width: 140,
      render: (_v, r) => r.user?.name ?? "—",
    },
    {
      title: t("shiftColumn"),
      dataIndex: "shift_id",
      key: "shift_id",
      width: 90,
      render: (id: number | null) =>
        id ? <Text type="secondary">{`#${id}`}</Text> : "—",
    },
    {
      title: t("reasonColumn"),
      dataIndex: "reason",
      key: "reason",
      ellipsis: true,
      render: (reason: string | null) => reason ?? "—",
    },
    {
      title: t("returnMethodColumn"),
      dataIndex: "returned_payment_method",
      key: "method",
      align: "center",
      width: 130,
      render: (method: string) => {
        const key = method ?? "";
        return (
          <Tag color={METHOD_COLORS[key] ?? "default"}>
            {METHOD_LABELS[key] ?? key ?? "—"}
          </Tag>
        );
      },
    },
    {
      title: t("itemsColumnShort"),
      key: "items",
      align: "center",
      width: 80,
      render: (_v, r) => <Tag>{r.items?.length ?? 0}</Tag>,
    },
    {
      title: t("totalColumn"),
      key: "total",
      align: "right",
      width: 130,
      render: (_v, r) => (
        <Text strong type="danger" style={{ whiteSpace: "nowrap" }}>
          {formatCurrency(returnItemsTotal(r))}
        </Text>
      ),
    },
  ];

  return (
    <ConfigProvider
      direction={direction}
      locale={language === "ar" ? arEG : enUS}
      theme={getAntdThemeConfig(resolvedTheme)}
    >
      <AntApp>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header */}
          <Flex align="center" gap={12} wrap>
            <Button
              type="text"
              icon={direction === "rtl" ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
              onClick={() => navigate("/sales/pos-blank")}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Title level={4} style={{ margin: 0 }}>
                {t("returnsPageHeading")}
              </Title>
              <Text type="secondary">{t("returnsPageSubtitle")}</Text>
            </div>
          </Flex>

          {/* Summary */}
          <Flex gap={16} wrap>
            <Card size="small" style={{ minWidth: 200 }}>
              <Statistic
                title={t("returnsCountLabel")}
                value={meta.total ?? returns.length}
                prefix={<PackageX size={16} />}
              />
            </Card>
            <Card size="small" style={{ minWidth: 220 }}>
              <Statistic
                title={t("totalValueLabel")}
                value={formatCurrency(pageTotal)}
                prefix={<DollarSign size={16} />}
                valueStyle={{ color: "#cf1322" }}
              />
            </Card>
          </Flex>

          {/* Filters */}
          <Card size="small">
            <Flex gap={12} wrap align="center">
              <RangePicker
                allowClear={false}
                value={[dayjs(startDate), dayjs(endDate)]}
                onChange={handleRangeChange}
              />
              <Select
                style={{ minWidth: 200 }}
                placeholder={t("allShifts")}
                allowClear
                loading={shiftsQuery.isLoading}
                value={shiftId || undefined}
                onChange={(value) => patchParams({ shiftId: value ?? null, page: "1" })}
                options={(shiftsQuery.data ?? []).map((s) => ({
                  value: String(s.id),
                  label:
                    (s.name ? s.name : t("shiftHashFilter", { id: s.id })) +
                    (s.shift_date ? ` (${s.shift_date})` : ""),
                }))}
              />
              <Select
                style={{ minWidth: 200 }}
                placeholder={t("allUsers")}
                allowClear
                showSearch
                optionFilterProp="label"
                loading={usersQuery.isLoading}
                value={userId || undefined}
                onChange={(value) => patchParams({ userId: value ?? null, page: "1" })}
                options={(usersQuery.data ?? []).map((u) => ({
                  value: String(u.id),
                  label: u.name,
                }))}
              />
              {hasActiveFilters && (
                <Button type="link" onClick={resetFilters}>
                  {t("clearFiltersButton")}
                </Button>
              )}
              <div style={{ flex: 1 }} />
              <Tooltip title={tCommon("refresh")}>
                <Button
                  icon={
                    <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
                  }
                  onClick={() => refetch()}
                  loading={isFetching && !isLoading}
                />
              </Tooltip>
            </Flex>
          </Card>

          {/* Table */}
          <Card size="small" styles={{ body: { padding: 0 } }}>
            <Table<SaleReturn>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={returns}
              loading={isLoading}
              scroll={{ x: 900 }}
              locale={{ emptyText: t("noReturnsMatchFilters") }}
              pagination={{
                current: meta.current_page ?? page,
                pageSize: PER_PAGE,
                total: meta.total ?? returns.length,
                showSizeChanger: false,
                showTotal: (total) => t("returnsCountLabel") + `: ${total}`,
              }}
              onChange={(pagination) =>
                patchParams({ page: String(pagination.current ?? 1) })
              }
            />
          </Card>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

export default SalesReturnsListPage;
