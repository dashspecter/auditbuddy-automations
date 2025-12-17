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
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { useCmmsParts, useCmmsPartStock } from '@/hooks/useCmmsParts';
import { NewPartDialog } from '@/components/cmms/NewPartDialog';
import { RestockDialog } from '@/components/cmms/RestockDialog';

export default function PartsInventory() {
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
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Parts Inventory</h1>
          <Button onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Part
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search parts (name, SKU)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Parts Table */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading parts...</div>
        ) : filteredParts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No parts yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                Add parts to track inventory and consumption on work orders.
              </p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Part
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Min Qty</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParts.map((part) => {
                  const stock = getPartStock(part.id);
                  const lowStock = isLowStock(part);
                  return (
                    <TableRow key={part.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {part.name}
                          {lowStock && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {part.sku || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lowStock ? 'destructive' : 'secondary'}>
                          {stock} {part.unit || 'units'}
                        </Badge>
                      </TableCell>
                      <TableCell>{part.minimum_qty || '-'}</TableCell>
                      <TableCell>{part.reorder_qty || '-'}</TableCell>
                      <TableCell>
                        {part.avg_unit_cost ? `$${part.avg_unit_cost.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setRestockPart({ id: part.id, name: part.name })}
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewPartDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
      
      {restockPart && (
        <RestockDialog 
          open={!!restockPart} 
          onOpenChange={(open) => !open && setRestockPart(null)}
          partId={restockPart.id}
          partName={restockPart.name}
        />
      )}
    </AppLayout>
  );
}
