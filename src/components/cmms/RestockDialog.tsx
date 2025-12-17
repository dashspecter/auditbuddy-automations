import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRestockPart } from '@/hooks/useCmmsParts';

interface RestockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partId: string;
  partName: string;
}

export function RestockDialog({ open, onOpenChange, partId, partName }: RestockDialogProps) {
  const restockPart = useRestockPart();
  const [quantity, setQuantity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await restockPart.mutateAsync({
      partId,
      quantity: parseInt(quantity),
      reason: 'Manual restock',
    });

    onOpenChange(false);
    setQuantity('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Restock Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Adding stock for: <strong>{partName}</strong>
          </p>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity to add</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              placeholder="10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              This updates inventory and creates a stock transaction.
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!quantity || restockPart.isPending}>
              Confirm restock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
