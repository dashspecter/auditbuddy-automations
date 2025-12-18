import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, FileText } from 'lucide-react';
import { useCmmsPurchaseOrders } from '@/hooks/useCmmsPurchaseOrders';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { Draft: 'secondary', Submitted: 'default', Partial: 'outline', Received: 'default', Cancelled: 'destructive' };

export default function PurchaseOrders() {
  const { t } = useTranslation();
  const { data: purchaseOrders, isLoading } = useCmmsPurchaseOrders();
  const [searchQuery, setSearchQuery] = useState('');
  const filteredPOs = purchaseOrders?.filter(po => po.po_number.toString().includes(searchQuery) || po.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || po.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('cmms.purchaseOrders.title')}</h1>
        <Button><Plus className="h-4 w-4 mr-2" />{t('cmms.purchaseOrders.newPO')}</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={t('cmms.purchaseOrders.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>
      {isLoading ? <div className="text-center py-12 text-muted-foreground">{t('cmms.purchaseOrders.loading')}</div> : filteredPOs.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><FileText className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">{t('cmms.purchaseOrders.noPOs')}</h3><p className="text-muted-foreground mb-4 max-w-sm">{t('cmms.purchaseOrders.noPOsDescription')}</p><Button><Plus className="h-4 w-4 mr-2" />{t('cmms.purchaseOrders.newPO')}</Button></CardContent></Card>
      ) : (
        <div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead>{t('cmms.purchaseOrders.poNumber')}</TableHead><TableHead>{t('cmms.purchaseOrders.vendor')}</TableHead><TableHead>{t('cmms.purchaseOrders.location')}</TableHead><TableHead>{t('cmms.purchaseOrders.status')}</TableHead><TableHead>{t('cmms.purchaseOrders.expected')}</TableHead><TableHead>{t('cmms.purchaseOrders.total')}</TableHead></TableRow></TableHeader><TableBody>
          {filteredPOs.map((po) => <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50"><TableCell className="font-medium">PO-{po.po_number}</TableCell><TableCell>{po.vendor?.name || '-'}</TableCell><TableCell>{po.location?.name || '-'}</TableCell><TableCell><Badge variant={statusColors[po.status] || 'secondary'}>{po.status}</Badge></TableCell><TableCell>{po.expected_at ? format(new Date(po.expected_at), 'MMM d, yyyy') : '-'}</TableCell><TableCell>{po.total_cost ? `$${po.total_cost.toFixed(2)}` : '-'}</TableCell></TableRow>)}
        </TableBody></Table></div>
      )}
    </div>
  );
}
