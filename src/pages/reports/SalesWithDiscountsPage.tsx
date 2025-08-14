import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import saleService, { Sale as ApiSale } from '@/services/saleService';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/constants';

const SalesWithDiscountsPage: React.FC = () => {
  const { t } = useTranslation(['reports', 'common']);
  const [sales, setSales] = useState<ApiSale[]>([]);
  const [loading, setLoading] = useState(false);
  const toYmd = (d: Date) => d.toISOString().split('T')[0];
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState<string>(toYmd(firstDay));
  const [endDate, setEndDate] = useState<string>(toYmd(lastDay));
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('has_discount', '1');
      params.append('per_page', String(perPage));
      params.append('page', String(page));
      const resp = await saleService.getSales(page, params.toString());
      const items = (resp.data as ApiSale[]).filter(s => Number((s as ApiSale).discount_amount || 0) > 0);
      setSales(items);
    } catch (e) {
      console.error('Failed to fetch discounted sales', e);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalAmount = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
    const totalPaid = sales.reduce((sum, s) => sum + Number(s.paid_amount || 0), 0);
    const totalDiscount = sales.reduce((sum, s) => sum + Number((s.discount_amount as number | string | undefined) || 0), 0);
    return { totalAmount, totalPaid, totalDiscount, totalDue: totalAmount - totalPaid };
  }, [sales]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <label className="text-sm">Start</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm">End</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <Button onClick={() => { setPage(1); fetchSales(); }} disabled={loading}>{t('common:filter') || 'Filter'}</Button>
      </div>

      {/* Discount summary cards */}
      <div className="flex items-center gap-2">
        <Card className="inline-block">
          <CardContent className="p-2 text-center">
            <div className="text-2xl font-bold text-red-600">{formatNumber(totals.totalDiscount)}</div>
          </CardContent>
        </Card>
        <Card className="inline-block">
          <CardContent className="p-2 text-center">
            <div className="text-2xl font-bold">{formatNumber(sales.length)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">ID</TableHead>
                  <TableHead className="text-center">Date</TableHead>
                  <TableHead className="text-center">Client</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Paid</TableHead>
                  <TableHead className="text-center">Discount</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center p-6">Loading...</TableCell></TableRow>
                ) : sales.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center p-6">No discounted sales</TableCell></TableRow>
                ) : (
                  sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-center">#{s.id}</TableCell>
                      <TableCell className="text-center">{(s as ApiSale).sale_date}</TableCell>
                      <TableCell className="text-center">{(s as ApiSale).client_name || '-'}</TableCell>
                      <TableCell className="text-center">{formatNumber(Number(s.total_amount))}</TableCell>
                      <TableCell className="text-center text-green-600">{formatNumber(Number(s.paid_amount))}</TableCell>
                      <TableCell className="text-center text-red-600">{formatNumber(Number((s.discount_amount as number | string | undefined) || 0))}</TableCell>
                      <TableCell className="text-center">{(s.discount_type as string | undefined) || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesWithDiscountsPage;


