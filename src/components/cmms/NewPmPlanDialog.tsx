import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateCmmsPmPlan, calculateNextDueDate } from '@/hooks/useCmmsPmPlans';
import { useCmmsAssets } from '@/hooks/useCmmsAssets';
import { useCmmsProcedures } from '@/hooks/useCmmsProcedures';
import { useLocations } from '@/hooks/useLocations';
import { format } from 'date-fns';

interface NewPmPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewPmPlanDialog({ open, onOpenChange }: NewPmPlanDialogProps) {
  const createPmPlan = useCreateCmmsPmPlan();
  const { data: assets } = useCmmsAssets();
  const { data: procedures } = useCmmsProcedures();
  const { data: locations } = useLocations();
  
  const [formData, setFormData] = useState({
    name: '',
    scope_type: 'asset' as 'asset' | 'location',
    asset_id: '',
    location_id: '',
    frequency_type: 'monthly',
    frequency_value: 1,
    procedure_id: '',
    auto_create_work_order: true,
    default_priority: 'Medium',
  });

  const nextDue = calculateNextDueDate(new Date(), formData.frequency_type, formData.frequency_value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createPmPlan.mutateAsync({
      name: formData.name,
      scope_type: formData.scope_type,
      asset_id: formData.scope_type === 'asset' && formData.asset_id ? formData.asset_id : undefined,
      location_id: formData.scope_type === 'location' && formData.location_id ? formData.location_id : undefined,
      frequency_type: formData.frequency_type,
      frequency_value: formData.frequency_value,
      next_due_at: nextDue.toISOString(),
      procedure_id: formData.procedure_id || undefined,
      auto_create_work_order: formData.auto_create_work_order,
      default_priority: formData.default_priority,
    });

    onOpenChange(false);
    setFormData({
      name: '',
      scope_type: 'asset',
      asset_id: '',
      location_id: '',
      frequency_type: 'monthly',
      frequency_value: 1,
      procedure_id: '',
      auto_create_work_order: true,
      default_priority: 'Medium',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New PM Plan</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Quarterly HVAC Compressor PM"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Scope Type</Label>
            <Select
              value={formData.scope_type}
              onValueChange={(value: 'asset' | 'location') => setFormData({ ...formData, scope_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Single Asset</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.scope_type === 'asset' && (
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select
                value={formData.asset_id}
                onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets?.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name} ({asset.asset_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.scope_type === 'location' && (
            <div className="space-y-2">
              <Label>Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => setFormData({ ...formData, location_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formData.frequency_type}
                onValueChange={(value) => setFormData({ ...formData, frequency_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Every</Label>
              <Input
                type="number"
                min={1}
                value={formData.frequency_value}
                onChange={(e) => setFormData({ ...formData, frequency_value: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Next due: {format(nextDue, 'MMM d, yyyy')}
          </p>

          <div className="space-y-2">
            <Label>Procedure (optional)</Label>
            <Select
              value={formData.procedure_id}
              onValueChange={(value) => setFormData({ ...formData, procedure_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Attach a procedure" />
              </SelectTrigger>
              <SelectContent>
                {procedures?.filter(p => p.is_published).map((proc) => (
                  <SelectItem key={proc.id} value={proc.id}>
                    {proc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Priority</Label>
            <Select
              value={formData.default_priority}
              onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="auto-create" className="font-medium">Auto-create Work Orders</Label>
              <p className="text-sm text-muted-foreground">Automatically generate work orders when due</p>
            </div>
            <Switch
              id="auto-create"
              checked={formData.auto_create_work_order}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_create_work_order: checked })}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.name || createPmPlan.isPending}>
              Create PM Plan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
