import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateCmmsProcedure } from '@/hooks/useCmmsProcedures';
import { useNavigate } from 'react-router-dom';

interface NewProcedureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewProcedureDialog({ open, onOpenChange }: NewProcedureDialogProps) {
  const navigate = useNavigate();
  const createProcedure = useCreateCmmsProcedure();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_minutes: '',
    safety_notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = await createProcedure.mutateAsync({
      title: formData.title,
      description: formData.description || undefined,
      estimated_minutes: formData.estimated_minutes ? parseInt(formData.estimated_minutes) : undefined,
      safety_notes: formData.safety_notes || undefined,
    });

    onOpenChange(false);
    setFormData({ title: '', description: '', estimated_minutes: '', safety_notes: '' });
    navigate(`/cmms/procedures/${result.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Procedure</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., HVAC Filter Replacement"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this procedure..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimated_minutes">Estimated time (minutes)</Label>
            <Input
              id="estimated_minutes"
              type="number"
              placeholder="30"
              value={formData.estimated_minutes}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="safety_notes">Safety notes</Label>
            <Textarea
              id="safety_notes"
              placeholder="Important safety considerations..."
              value={formData.safety_notes}
              onChange={(e) => setFormData({ ...formData, safety_notes: e.target.value })}
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title || createProcedure.isPending}>
              Create & Edit Steps
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
