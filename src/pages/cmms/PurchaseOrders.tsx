import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Plus, Search, FileText } from 'lucide-react';
import { useCmmsPurchaseOrders } from '@/hooks/useCmmsPurchaseOrders';
import { format } from 'date-fns';

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Submitted: 'default',
  Partial: 'outline',
  Received: 'default',
  Cancelled: 'destructive',
};

export default function PurchaseOrders() {
  const { data: purchaseOrders, isLoading } = useCmmsPurchaseOrders();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPOs = purchaseOrders?.filter(po =>
    po.po_number.toString().includes(searchQuery) ||
    po.vendor?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    po.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New PO
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search POs (number, vendor, location)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* PO Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading purchase orders...</div>
        ) : filteredPOs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No purchase orders yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Create purchase orders to track part orders and receiving.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New PO
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">PO-{po.po_number}</TableCell>
                    <TableCell>{po.vendor?.name || '-'}</TableCell>
                    <TableCell>{po.location?.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[po.status] || 'secondary'}>
                        {po.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {po.expected_at ? format(new Date(po.expected_at), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {po.total_cost ? `$${po.total_cost.toFixed(2)}` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
