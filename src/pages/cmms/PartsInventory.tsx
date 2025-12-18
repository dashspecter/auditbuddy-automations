import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { useCmmsParts, useCmmsPartStock } from '@/hooks/useCmmsParts';
import { NewPartDialog } from '@/components/cmms/NewPartDialog';
import { RestockDialog } from '@/components/cmms/RestockDialog';
import { useTranslation } from 'react-i18next';

export default function PartsInventory() {
  const { t } = useTranslation();
  const { data: parts, isLoading } = useCmmsParts();
  const { data: allStock } = useCmmsPartStock();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [restockPart, setRestockPart] = useState<{ id: string; name: string } | null>(null);

  const filteredParts = parts?.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getPartStock = (partId: string) => {
    const stocks = allStock?.filter(s => s.part_id === partId) || [];
    return stocks.reduce((sum, s) => sum + s.qty_on_hand, 0);
  };

  const isLowStock = (part: typeof filteredParts[0]) => {
    const stock = getPartStock(part.id);
    return part.minimum_qty && stock <= part.minimum_qty;
  };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{t('cmms.partsPage.title')}</h1>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('cmms.partsPage.newPart')}
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t('cmms.partsPage.searchPlaceholder')} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-10" 
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">{t('cmms.partsPage.loading')}</div>
        ) : filteredParts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('cmms.partsPage.noParts')}</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">{t('cmms.partsPage.noPartsDescription')}</p>
              <Button onClick={() => setShowNewDialog(true)}><Plus className="h-4 w-4 mr-2" />{t('cmms.partsPage.newPart')}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('cmms.partsPage.table.part')}</TableHead>
                  <TableHead>{t('cmms.partsPage.table.sku')}</TableHead>
                  <TableHead>{t('cmms.partsPage.table.stock')}</TableHead>
                  <TableHead>{t('cmms.partsPage.table.minQty')}</TableHead>
                  <TableHead>{t('cmms.partsPage.table.reorderQty')}</TableHead>
                  <TableHead>{t('cmms.partsPage.table.avgCost')}</TableHead>
                  <TableHead className="w-[100px]">{t('cmms.partsPage.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const stock = getPartStock(part.id);
                  const lowStock = isLowStock(part);
                  return (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">{part.name}{lowStock && <AlertTriangle className="h-4 w-4 text-amber-500" />}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{part.sku || '-'}</TableCell>
                      <TableCell><Badge variant={lowStock ? 'destructive' : 'secondary'}>{stock} {part.unit || t('cmms.partsPage.units')}</Badge></TableCell>
                      <TableCell>{part.minimum_qty || '-'}</TableCell>
                      <TableCell>{part.reorder_qty || '-'}</TableCell>
                      <TableCell>{part.avg_unit_cost ? `$${part.avg_unit_cost.toFixed(2)}` : '-'}</TableCell>
                      <TableCell><Button variant="outline" size="sm" onClick={() => setRestockPart({ id: part.id, name: part.name })}>{t('cmms.partsPage.restock')}</Button></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <NewPartDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      {restockPart && <RestockDialog open={!!restockPart} onOpenChange={(open) => !open && setRestockPart(null)} partId={restockPart.id} partName={restockPart.name} />}
    </>
  );
}
