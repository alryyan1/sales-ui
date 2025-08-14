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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
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
      setSales(resp.data as unknown as ApiSale[]);
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
    const totalDiscount = sales.reduce((sum, s) => sum + Number((s as any).discount_amount || 0), 0);
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

      {/* Analytics for discounts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Discount</div>
            <div className="text-2xl font-bold text-red-600">{formatNumber(totals.totalDiscount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Sales</div>
            <div className="text-2xl font-bold">{formatNumber(totals.totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatNumber(totals.totalPaid)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Due</div>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(totals.totalDue)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Type</TableHead>
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
                      <TableCell>#{s.id}</TableCell>
                      <TableCell>{(s as any).sale_date}</TableCell>
                      <TableCell>{(s as any).client_name || '-'}</TableCell>
                      <TableCell>{formatNumber(Number(s.total_amount))}</TableCell>
                      <TableCell className="text-green-600">{formatNumber(Number(s.paid_amount))}</TableCell>
                      <TableCell className="text-red-600">{formatNumber(Number((s as any).discount_amount || 0))}</TableCell>
                      <TableCell>{(s as any).discount_type || '-'}</TableCell>
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


