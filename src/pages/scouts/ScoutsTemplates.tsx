import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useScoutTemplates,
  useScoutTemplateSteps,
  useCreateScoutTemplate,
  useUpdateScoutTemplate,
  useDeleteScoutTemplate,
  ScoutTemplateStep,
  ScoutTemplate,
} from "@/hooks/useScoutTemplates";
import { Plus, Trash2, Eye, Pencil, GripVertical } from "lucide-react";
import { format } from "date-fns";

const STEP_TYPES = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checklist', label: 'Checklist' },
];

const emptyForm = { title: '', category: 'general', estimated_duration_minutes: 15, guidance_text: '' };

const ScoutsTemplates = () => {
  const { data: templates = [], isLoading } = useScoutTemplates();
  const createTemplate = useCreateScoutTemplate();
  const updateTemplate = useUpdateScoutTemplate();
  const deleteTemplate = useDeleteScoutTemplate();

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | 'edit' | 'view'>('closed');
  const [editingId, setEditingId] = useState<string | undefined>();
  const [viewId, setViewId] = useState<string | undefined>();

  const activeTemplateId = dialogMode === 'view' ? viewId : dialogMode === 'edit' ? editingId : undefined;
  const { data: loadedSteps = [] } = useScoutTemplateSteps(activeTemplateId);

  const [form, setForm] = useState(emptyForm);
  const [steps, setSteps] = useState<Omit<ScoutTemplateStep, 'id' | 'template_id'>[]>([]);

  // When opening edit mode, populate form + steps from loaded data
  useEffect(() => {
    if (dialogMode === 'edit' && editingId && loadedSteps.length >= 0) {
      const tmpl = templates.find(t => t.id === editingId);
      if (tmpl) {
        setForm({
          title: tmpl.title,
          category: tmpl.category,
          estimated_duration_minutes: tmpl.estimated_duration_minutes,
          guidance_text: tmpl.guidance_text ?? '',
        });
      }
      setSteps(loadedSteps.map(s => ({
        step_order: s.step_order,
        prompt: s.prompt,
        step_type: s.step_type,
        is_required: s.is_required,
        min_photos: s.min_photos,
        min_videos: s.min_videos,
        guidance_text: s.guidance_text,
        validation_rules: s.validation_rules ?? {},
        weight: s.weight ?? 1,
      })));
    }
  }, [dialogMode, editingId, loadedSteps, templates]);

  const openCreate = () => {
    setForm(emptyForm);
    setSteps([]);
    setDialogMode('create');
  };

  const openEdit = (tmpl: ScoutTemplate) => {
    setEditingId(tmpl.id);
    setDialogMode('edit');
  };

  const openView = (id: string) => {
    setViewId(id);
    setDialogMode('view');
  };

  const closeDialog = () => {
    setDialogMode('closed');
    setEditingId(undefined);
    setViewId(undefined);
  };

  const addStep = () => {
    setSteps(prev => [...prev, {
      step_order: prev.length + 1,
      prompt: '',
      step_type: 'photo',
      is_required: true,
      min_photos: 1,
      min_videos: 0,
      guidance_text: null,
      validation_rules: {},
      weight: 1,
    }]);
  };

  const updateStep = (idx: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const handleSave = () => {
    if (!form.title || steps.length === 0) return;

    if (dialogMode === 'edit' && editingId) {
      updateTemplate.mutate({ id: editingId, ...form, steps }, { onSuccess: closeDialog });
    } else {
      createTemplate.mutate({ ...form, steps }, { onSuccess: closeDialog });
    }
  };

  const isSaving = createTemplate.isPending || updateTemplate.isPending;
  const isEditing = dialogMode === 'edit';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scout Templates</h1>
          <p className="text-muted-foreground">Define job checklist templates with required evidence steps.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : templates.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No templates. Create your first one.</TableCell></TableRow>
              ) : templates.map(tmpl => (
                <TableRow key={tmpl.id}>
                  <TableCell className="font-medium">{tmpl.title}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">{tmpl.category}</TableCell>
                  <TableCell>{tmpl.estimated_duration_minutes} min</TableCell>
                  <TableCell>v{tmpl.version}</TableCell>
                  <TableCell>
                    <Badge variant={tmpl.is_active ? 'default' : 'secondary'}>
                      {tmpl.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(tmpl.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openView(tmpl.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(tmpl)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteTemplate.mutate(tmpl.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Steps Dialog */}
      <Dialog open={dialogMode === 'view'} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Steps</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {loadedSteps.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3 p-2 border rounded-md">
                <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.prompt}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.step_type}{s.is_required ? ' • Required' : ''}{s.min_photos > 0 ? ` • ${s.min_photos} photo(s)` : ''} • Weight {s.weight ?? 1}/5</p>
                </div>
              </div>
            ))}
            {loadedSteps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No steps defined.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Template Dialog */}
      <Dialog open={dialogMode === 'create' || dialogMode === 'edit'} onOpenChange={() => closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Scout Template' : 'Create Scout Template'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Cleanliness Check" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="cleanliness">Cleanliness</SelectItem>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimated Duration (minutes)</Label>
              <Input type="number" value={form.estimated_duration_minutes} onChange={e => setForm(f => ({ ...f, estimated_duration_minutes: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Guidance Text</Label>
              <Textarea value={form.guidance_text} onChange={e => setForm(f => ({ ...f, guidance_text: e.target.value }))} placeholder="General guidance for scouts..." />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps ({steps.length})</Label>
                <Button size="sm" variant="outline" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Add Step
                </Button>
              </div>
              {steps.map((step, idx) => (
                <Card key={idx} className="p-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">Step {idx + 1}</span>
                      <div className="flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => removeStep(idx)} className="h-7 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input value={step.prompt} onChange={e => updateStep(idx, 'prompt', e.target.value)} placeholder="Step prompt/instruction..." />
                    <div className="grid grid-cols-4 gap-2">
                      <Select value={step.step_type} onValueChange={v => updateStep(idx, 'step_type', v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {(step.step_type === 'photo' || step.step_type === 'video') && (
                        <Input type="number" className="h-8" value={step.step_type === 'photo' ? step.min_photos : step.min_videos} onChange={e => updateStep(idx, step.step_type === 'photo' ? 'min_photos' : 'min_videos', Number(e.target.value))} placeholder="Min count" />
                      )}
                      <Select value={String(step.weight)} onValueChange={v => updateStep(idx, 'weight', Number(v))}>
                        <SelectTrigger className="h-8"><SelectValue placeholder="Weight" /></SelectTrigger>
                        <SelectContent>
                          {[1,2,3,4,5].map(w => <SelectItem key={w} value={String(w)}>Weight {w}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              ))}
              {steps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Add at least one step.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving || !form.title || steps.length === 0}>
              {isEditing ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScoutsTemplates;
