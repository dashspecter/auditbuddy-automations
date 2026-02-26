import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScoutTemplates, useScoutTemplateSteps, useCreateScoutTemplate, useDeleteScoutTemplate, ScoutTemplateStep } from "@/hooks/useScoutTemplates";
import { Plus, Trash2, Eye, GripVertical } from "lucide-react";
import { format } from "date-fns";

const STEP_TYPES = [
  { value: 'photo', label: 'Photo' },
  { value: 'video', label: 'Video' },
  { value: 'yes_no', label: 'Yes/No' },
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'checklist', label: 'Checklist' },
];

const ScoutsTemplates = () => {
  const { data: templates = [], isLoading } = useScoutTemplates();
  const createTemplate = useCreateScoutTemplate();
  const deleteTemplate = useDeleteScoutTemplate();
  
  const [showCreate, setShowCreate] = useState(false);
  const [viewId, setViewId] = useState<string | undefined>();
  const { data: viewSteps = [] } = useScoutTemplateSteps(viewId);
  
  const [form, setForm] = useState({
    title: '',
    category: 'general',
    estimated_duration_minutes: 15,
    guidance_text: '',
  });
  
  const [steps, setSteps] = useState<Omit<ScoutTemplateStep, 'id' | 'template_id'>[]>([]);

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
    }]);
  };

  const updateStep = (idx: number, field: string, value: any) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const removeStep = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_order: i + 1 })));
  };

  const handleCreate = () => {
    if (!form.title || steps.length === 0) return;
    createTemplate.mutate({ ...form, steps }, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ title: '', category: 'general', estimated_duration_minutes: 15, guidance_text: '' });
        setSteps([]);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scout Templates</h1>
          <p className="text-muted-foreground">Define job checklist templates with required evidence steps.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
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
                <TableHead className="w-[100px]"></TableHead>
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
                      <Button size="sm" variant="ghost" onClick={() => setViewId(tmpl.id)}>
                        <Eye className="h-4 w-4" />
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
      <Dialog open={!!viewId} onOpenChange={() => setViewId(undefined)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Template Steps</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {viewSteps.map((s: any, i: number) => (
              <div key={s.id} className="flex items-center gap-3 p-2 border rounded-md">
                <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{s.prompt}</p>
                  <p className="text-xs text-muted-foreground capitalize">{s.step_type}{s.is_required ? ' • Required' : ''}{s.min_photos > 0 ? ` • ${s.min_photos} photo(s)` : ''}</p>
                </div>
              </div>
            ))}
            {viewSteps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No steps defined.</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Scout Template</DialogTitle>
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
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={step.step_type} onValueChange={v => updateStep(idx, 'step_type', v)}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {(step.step_type === 'photo' || step.step_type === 'video') && (
                        <Input type="number" className="h-8" value={step.step_type === 'photo' ? step.min_photos : step.min_videos} onChange={e => updateStep(idx, step.step_type === 'photo' ? 'min_photos' : 'min_videos', Number(e.target.value))} placeholder="Min count" />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {steps.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Add at least one step to create a template.</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTemplate.isPending || !form.title || steps.length === 0}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScoutsTemplates;
