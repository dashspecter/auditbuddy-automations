import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreateAuditRevision } from "@/hooks/useAuditRevisions";
import { LocationAudit } from "@/hooks/useAudits";
import { Loader2 } from "lucide-react";

interface EditAuditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audit: LocationAudit;
  onSuccess: () => void;
}

const locations = ["LBFC Amzei", "LBFC Mosilor", "LBFC Timpuri Noi", "LBFC Apaca"];

export const EditAuditDialog = ({ open, onOpenChange, audit, onSuccess }: EditAuditDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [templateSections, setTemplateSections] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    location: audit.location,
    audit_date: audit.audit_date,
    time_start: audit.time_start || '',
    time_end: audit.time_end || '',
    notes: audit.notes || '',
    custom_data: audit.custom_data || {},
  });

  const createRevision = useCreateAuditRevision();

  useEffect(() => {
    if (audit.template_id && open) {
      loadTemplateSections(audit.template_id);
    }
  }, [audit.template_id, open]);

  const loadTemplateSections = async (templateId: string) => {
    try {
      const { data: sections, error } = await supabase
        .from('audit_sections')
        .select(`
          id,
          name,
          description,
          display_order,
          audit_fields (
            id,
            name,
            field_type,
            is_required,
            display_order,
            options
          )
        `)
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (sections) {
        const formattedSections = sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description,
          fields: (section.audit_fields || [])
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((field: any) => ({
              id: field.id,
              name: field.name,
              field_type: field.field_type,
              is_required: field.is_required,
              options: field.options
            }))
        }));
        setTemplateSections(formattedSections);
      }
    } catch (error) {
      console.error('Error loading template sections:', error);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      custom_data: {
        ...prev.custom_data,
        [fieldId]: value
      }
    }));
  };

  const renderField = (field: any) => {
    const value = formData.custom_data[field.id];

    switch (field.field_type) {
      case 'rating':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            <RadioGroup
              value={value?.toString()}
              onValueChange={(val) => handleFieldChange(field.id, parseInt(val))}
            >
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex items-center space-x-2">
                    <RadioGroupItem value={rating.toString()} id={`${field.id}-${rating}`} />
                    <Label htmlFor={`${field.id}-${rating}`}>{rating}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 'yes_no':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            <RadioGroup
              value={value?.toString()}
              onValueChange={(val) => handleFieldChange(field.id, val === 'true')}
            >
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${field.id}-yes`} />
                  <Label htmlFor={`${field.id}-yes`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${field.id}-no`} />
                  <Label htmlFor={`${field.id}-no`}>No</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        );

      case 'text':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="number"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, parseFloat(e.target.value))}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.name} {field.is_required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.id}
              type="date"
              value={value || ''}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Track what changed
      const changes: Record<string, { old: any; new: any }> = {};

      if (formData.location !== audit.location) {
        changes.location = { old: audit.location, new: formData.location };
      }
      if (formData.audit_date !== audit.audit_date) {
        changes.audit_date = { old: audit.audit_date, new: formData.audit_date };
      }
      if (formData.time_start !== (audit.time_start || '')) {
        changes.time_start = { old: audit.time_start, new: formData.time_start };
      }
      if (formData.time_end !== (audit.time_end || '')) {
        changes.time_end = { old: audit.time_end, new: formData.time_end };
      }
      if (formData.notes !== (audit.notes || '')) {
        changes.notes = { old: audit.notes, new: formData.notes };
      }

      // Check custom_data changes
      const oldCustomData = audit.custom_data || {};
      const newCustomData = formData.custom_data;
      
      for (const key in newCustomData) {
        if (JSON.stringify(oldCustomData[key]) !== JSON.stringify(newCustomData[key])) {
          if (!changes.custom_data) {
            changes.custom_data = { old: {}, new: {} };
          }
          (changes.custom_data.old as any)[key] = oldCustomData[key];
          (changes.custom_data.new as any)[key] = newCustomData[key];
        }
      }

      if (Object.keys(changes).length === 0) {
        toast.info('No changes detected');
        return;
      }

      // Recalculate score if custom_data changed
      let overallScore = audit.overall_score;
      if (changes.custom_data) {
        let totalRatings = 0;
        let ratingCount = 0;

        templateSections.forEach(section => {
          section.fields.forEach((field: any) => {
            if (field.field_type === 'rating') {
              const value = newCustomData[field.id];
              if (typeof value === 'number') {
                totalRatings += value;
                ratingCount++;
              }
            }
          });
        });

        overallScore = ratingCount > 0 
          ? Math.round((totalRatings / (ratingCount * 5)) * 100) 
          : 0;
      }

      const COMPLIANCE_THRESHOLD = 80;
      const status = overallScore && overallScore >= COMPLIANCE_THRESHOLD ? 'compliant' : 'non-compliant';

      // Update audit
      const { error: updateError } = await supabase
        .from('location_audits')
        .update({
          ...formData,
          time_start: formData.time_start || null,
          time_end: formData.time_end || null,
          overall_score: overallScore,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', audit.id);

      if (updateError) throw updateError;

      // Create revision record
      await createRevision.mutateAsync({
        auditId: audit.id,
        changes,
        changeSummary: `Updated ${Object.keys(changes).length} field${Object.keys(changes).length > 1 ? 's' : ''}`,
      });

      toast.success('Audit updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating audit:', error);
      toast.error(error.message || 'Failed to update audit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Audit</DialogTitle>
          <DialogDescription>
            Make changes to this audit. All changes will be tracked in the revision history.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location}
                onValueChange={(value) => setFormData({ ...formData, location: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audit_date">Audit Date *</Label>
              <Input
                id="audit_date"
                type="date"
                value={formData.audit_date}
                onChange={(e) => setFormData({ ...formData, audit_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_start">Start Time</Label>
              <Input
                id="time_start"
                type="time"
                value={formData.time_start}
                onChange={(e) => setFormData({ ...formData, time_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time_end">End Time</Label>
              <Input
                id="time_end"
                type="time"
                value={formData.time_end}
                onChange={(e) => setFormData({ ...formData, time_end: e.target.value })}
              />
            </div>
          </div>

          {templateSections.map((section) => (
            <div key={section.id} className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">{section.name}</h3>
              {section.description && (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {section.fields.map((field: any) => renderField(field))}
              </div>
            </div>
          ))}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional observations..."
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
