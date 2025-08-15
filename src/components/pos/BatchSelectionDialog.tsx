// src/components/pos/BatchSelectionDialog.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

// shadcn/ui Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

// Icons
import { Package, Calendar, AlertTriangle, Check } from "lucide-react";

// Types
import { Product } from "../../services/productService";
import apiClient from "../../lib/axios";

interface Batch {
  id: number;
  batch_number: string | null;
  remaining_quantity: number;
  expiry_date: string | null;
  sale_price: number;
  unit_cost: number;
}

interface BatchSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onBatchSelect: (batch: Batch) => void;
  selectedBatchId?: number | null;
}

export const BatchSelectionDialog: React.FC<BatchSelectionDialogProps> = ({
  open,
  onOpenChange,
  product,
  onBatchSelect,
  selectedBatchId,
}) => {
  const { t } = useTranslation(['pos', 'common']);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  useEffect(() => {
    if (open && product) {
      loadBatches();
    }
  }, [open, product]);

  useEffect(() => {
    if (selectedBatchId && batches.length > 0) {
      const batch = batches.find(b => b.id === selectedBatchId);
      setSelectedBatch(batch || null);
    }
  }, [selectedBatchId, batches]);

  const loadBatches = async () => {
    if (!product) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get(`/products/${product.id}/available-batches`);
      setBatches(response.data.data || []);
    } catch (error) {
      console.error('Error loading batches:', error);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batch: Batch) => {
    setSelectedBatch(batch);
  };

  const handleConfirm = () => {
    if (selectedBatch) {
      onBatchSelect(selectedBatch);
      onOpenChange(false);
    }
  };

  const formatExpiryDate = (dateString: string | null) => {
    if (!dateString) return t('common:n/a');
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const isExpiringSoon = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30;
  };

  const isExpired = (dateString: string | null) => {
    if (!dateString) return false;
    const expiryDate = new Date(dateString);
    const today = new Date();
    return expiryDate < today;
  };

  const getExpiryStatus = (dateString: string | null) => {
    if (isExpired(dateString)) return 'expired';
    if (isExpiringSoon(dateString)) return 'expiring-soon';
    return 'good';
  };

  const getExpiryColor = (status: string) => {
    switch (status) {
      case 'expired': return 'text-red-600';
      case 'expiring-soon': return 'text-orange-600';
      default: return 'text-green-600';
    }
  };

  const getExpiryIcon = (status: string) => {
    switch (status) {
      case 'expired': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'expiring-soon': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <Calendar className="h-4 w-4 text-green-600" />;
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] !max-w-[1200px] max-h-[80vh] overflow-hidden flex flex-col" style={{ width: '90vw', maxWidth: '1200px' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('pos:selectBatch')} - {product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Package className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t('pos:noBatchesAvailable')}</p>
              <p className="text-sm">{t('pos:noStockForProduct')}</p>
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">{t('pos:select')}</TableHead>
                    <TableHead className="text-center">{t('pos:batchNumber')}</TableHead>
                    <TableHead className="text-center">{t('pos:availableStock')}</TableHead>
                    <TableHead className="text-center">{t('pos:expiryDate')}</TableHead>
                    <TableHead className="text-center">{t('pos:salePrice')}</TableHead>
                    <TableHead className="text-center">{t('pos:unitCost')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const expiryStatus = getExpiryStatus(batch.expiry_date);
                    const isSelected = selectedBatch?.id === batch.id;
                    
                    return (
                      <TableRow 
                        key={batch.id}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50 border-blue-200' : ''
                        }`}
                        onClick={() => handleBatchSelect(batch)}
                      >
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {isSelected ? (
                              <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full border-2 border-gray-300"></div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="font-mono">
                            {batch.batch_number || `ID: ${batch.id}`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Package className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{batch.remaining_quantity}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getExpiryIcon(expiryStatus)}
                            <span className={getExpiryColor(expiryStatus)}>
                              {formatExpiryDate(batch.expiry_date)}
                            </span>
                          </div>
                          {expiryStatus === 'expired' && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              {t('pos:expired')}
                            </Badge>
                          )}
                          {expiryStatus === 'expiring-soon' && (
                            <Badge variant="secondary" className="text-xs mt-1 bg-orange-100 text-orange-800">
                              {t('pos:expiringSoon')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">
                            {batch.sale_price}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm text-gray-600">
                            {batch.unit_cost}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="text-sm text-gray-600">
            {batches.length > 0 && (
              <p>{t('pos:totalBatchesAvailable', { count: batches.length })}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common:cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedBatch || batches.length === 0}
            >
              {t('pos:selectBatch')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
