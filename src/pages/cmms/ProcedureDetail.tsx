import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Save, Upload, AlertTriangle, CheckCircle } from 'lucide-react';
import { useCmmsProcedureById, useCmmsProcedureSteps, useUpdateCmmsProcedure, usePublishCmmsProcedure, useCreateCmmsProcedureStep, useUpdateCmmsProcedureStep, useDeleteCmmsProcedureStep, CmmsProcedureStep } from '@/hooks/useCmmsProcedures';
import { ProcedureStepEditor } from '@/components/cmms/ProcedureStepEditor';

export default function ProcedureDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: procedure, isLoading: loadingProcedure } = useCmmsProcedureById(id);
  const { data: steps, isLoading: loadingSteps } = useCmmsProcedureSteps(id);
  
  const updateProcedure = useUpdateCmmsProcedure();
  const publishProcedure = usePublishCmmsProcedure();
  const createStep = useCreateCmmsProcedureStep();
  const updateStep = useUpdateCmmsProcedureStep();
  const deleteStep = useDeleteCmmsProcedureStep();

  const [formData, setFormData] = useState({ title: '', description: '', estimated_minutes: '', safety_notes: '' });
  const [localSteps, setLocalSteps] = useState<Partial<CmmsProcedureStep>[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => { if (procedure) { setFormData({ title: procedure.title, description: procedure.description || '', estimated_minutes: procedure.estimated_minutes?.toString() || '', safety_notes: procedure.safety_notes || '' }); } }, [procedure]);
  useEffect(() => { if (steps) { setLocalSteps(steps); } }, [steps]);

  const handleSave = async () => {
    if (!id) return;
    await updateProcedure.mutateAsync({ id, title: formData.title, description: formData.description || null, estimated_minutes: formData.estimated_minutes ? parseInt(formData.estimated_minutes) : null, safety_notes: formData.safety_notes || null });
    for (const step of localSteps) {
      if (step.id && steps?.find(s => s.id === step.id)) {
        await updateStep.mutateAsync({ id: step.id, title: step.title, instruction_text: step.instruction_text, requires_photo: step.requires_photo, requires_value: step.requires_value, value_type: step.value_type, choices_json: step.choices_json, step_order: step.step_order });
      } else if (!step.id) {
        await createStep.mutateAsync({ procedure_id: id, step_order: step.step_order || localSteps.indexOf(step) + 1, title: step.title || '', instruction_text: step.instruction_text, requires_photo: step.requires_photo, requires_value: step.requires_value, value_type: step.value_type, choices_json: step.choices_json });
      }
    }
    const localStepIds = localSteps.filter(s => s.id).map(s => s.id);
    for (const existingStep of steps || []) { if (!localStepIds.includes(existingStep.id)) { await deleteStep.mutateAsync({ id: existingStep.id, procedureId: id }); } }
    setHasChanges(false);
  };

  const handlePublish = async () => { if (!id) return; await handleSave(); await publishProcedure.mutateAsync(id); };
  const addStep = () => { setLocalSteps([...localSteps, { step_order: localSteps.length + 1, title: '', instruction_text: '', requires_photo: false, requires_value: false, value_type: 'text' }]); setHasChanges(true); };
  const updateLocalStep = (index: number, updates: Partial<CmmsProcedureStep>) => { const newSteps = [...localSteps]; newSteps[index] = { ...newSteps[index], ...updates }; setLocalSteps(newSteps); setHasChanges(true); };
  const deleteLocalStep = (index: number) => { const newSteps = localSteps.filter((_, i) => i !== index); newSteps.forEach((step, i) => { step.step_order = i + 1; }); setLocalSteps(newSteps); setHasChanges(true); };

  if (loadingProcedure || loadingSteps) { return <div className="p-6 text-center text-muted-foreground">Loading procedure...</div>; }
  if (!procedure) { return <div className="p-6 text-center text-muted-foreground">Procedure not found</div>; }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/cmms/procedures')}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{procedure.title}</h1>
              {procedure.is_published ? <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />v{procedure.version}</Badge> : <Badge variant="secondary">Draft</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSave} disabled={!hasChanges || updateProcedure.isPending}><Save className="h-4 w-4 mr-2" />Save</Button>
          <Button onClick={handlePublish} disabled={publishProcedure.isPending || localSteps.length === 0}><Upload className="h-4 w-4 mr-2" />Publish</Button>
        </div>
      </div>

      {!procedure.is_published && <Alert><AlertTriangle className="h-4 w-4" /><AlertDescription>Draft — not visible to technicians until published.</AlertDescription></Alert>}

      <Card>
        <CardHeader><CardTitle>Procedure Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="title">Title</Label><Input id="title" value={formData.title} onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setHasChanges(true); }} /></div>
          <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => { setFormData({ ...formData, description: e.target.value }); setHasChanges(true); }} rows={2} /></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="estimated_minutes">Estimated time (minutes)</Label><Input id="estimated_minutes" type="number" value={formData.estimated_minutes} onChange={(e) => { setFormData({ ...formData, estimated_minutes: e.target.value }); setHasChanges(true); }} /></div></div>
          <div className="space-y-2"><Label htmlFor="safety_notes">Safety Notes</Label><Textarea id="safety_notes" value={formData.safety_notes} onChange={(e) => { setFormData({ ...formData, safety_notes: e.target.value }); setHasChanges(true); }} rows={2} placeholder="Important safety considerations..." /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Checklist Steps</CardTitle><Button variant="outline" size="sm" onClick={addStep}><Plus className="h-4 w-4 mr-2" />Add Step</Button></CardHeader>
        <CardContent className="space-y-4">
          {localSteps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><p className="mb-4">No steps yet. Add steps to create your checklist.</p><Button onClick={addStep}><Plus className="h-4 w-4 mr-2" />Add First Step</Button></div>
          ) : (
            localSteps.map((step, index) => <ProcedureStepEditor key={step.id || `new-${index}`} step={step} index={index} onChange={(updates) => updateLocalStep(index, updates)} onDelete={() => deleteLocalStep(index)} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
