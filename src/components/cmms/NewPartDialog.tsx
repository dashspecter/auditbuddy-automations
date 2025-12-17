import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCmmsPart } from '@/hooks/useCmmsParts';

interface NewPartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPartDialog({ open, onOpenChange }: NewPartDialogProps) {
  const createPart = useCreateCmmsPart();
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    unit: 'each',
    minimum_qty: '',
    reorder_qty: '',
    avg_unit_cost: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createPart.mutateAsync({
      name: formData.name,
      sku: formData.sku || undefined,
      unit: formData.unit || undefined,
      minimum_qty: formData.minimum_qty ? parseInt(formData.minimum_qty) : undefined,
      reorder_qty: formData.reorder_qty ? parseInt(formData.reorder_qty) : undefined,
      avg_unit_cost: formData.avg_unit_cost ? parseFloat(formData.avg_unit_cost) : undefined,
    });

    onOpenChange(false);
    setFormData({
      name: '',
      sku: '',
      unit: 'each',
      minimum_qty: '',
      reorder_qty: '',
      avg_unit_cost: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Part</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Part Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Air Filter 20x25x1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                placeholder="AF-20251"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="each"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimum_qty">Minimum Qty</Label>
              <Input
                id="minimum_qty"
                type="number"
                placeholder="5"
                value={formData.minimum_qty}
                onChange={(e) => setFormData({ ...formData, minimum_qty: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorder_qty">Reorder Qty</Label>
              <Input
                id="reorder_qty"
                type="number"
                placeholder="10"
                value={formData.reorder_qty}
                onChange={(e) => setFormData({ ...formData, reorder_qty: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg_unit_cost">Avg Unit Cost ($)</Label>
            <Input
              id="avg_unit_cost"
              type="number"
              step="0.01"
              placeholder="12.50"
              value={formData.avg_unit_cost}
              onChange={(e) => setFormData({ ...formData, avg_unit_cost: e.target.value })}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || createPart.isPending}>
              Create Part
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
