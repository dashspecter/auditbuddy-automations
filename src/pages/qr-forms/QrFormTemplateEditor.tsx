import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Save, Trash2, GripVertical, Clock, Hash, Type, Calendar, CheckSquare, PenTool, Edit2 } from "lucide-react";
import { toast } from "sonner";

const FIELD_TYPES = [
  { value: "text", label: "Text", icon: Type },
  { value: "number", label: "Number", icon: Hash },
  { value: "date", label: "Date", icon: Calendar },
  { value: "time", label: "Time", icon: Clock },
  { value: "datetime", label: "Date & Time", icon: Calendar },
  { value: "select", label: "Dropdown", icon: CheckSquare },
  { value: "checkbox", label: "Checkbox", icon: CheckSquare },
  { value: "textarea", label: "Text Area", icon: Type },
  { value: "signature", label: "Signature / Initials", icon: PenTool },
  { value: "staff_picker", label: "Staff Picker", icon: Type },
];

interface FieldDef {
  key: string;
  type: string;
  label: string;
  required?: boolean;
  unit?: string;
  min?: number;
  max?: number;
  warnMin?: number;
  warnMax?: number;
  options?: string[];
  helperText?: string;
}

interface GridConfig {
  checkpoints: Array<{ time: string; label: string }>;
  cellFields: FieldDef[];
}

interface ColumnDef extends FieldDef {
  // Event log columns are essentially field definitions
}

interface TemplateSchema {
  sections?: any[];
  gridConfig?: GridConfig;
  columns?: ColumnDef[];
  maxRows?: number;
  recommendedRange?: { min: number; max: number; unit: string };
  complianceNotes?: string[];
  criteriaLegend?: Record<string, string>;
}

export default function QrFormTemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("temperature");
  const [isActive, setIsActive] = useState(true);
  const [schema, setSchema] = useState<TemplateSchema>({});
  const [versionNotes, setVersionNotes] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);

  // Fetch template + versions
  const { data: template, isLoading } = useQuery({
    queryKey: ["form-template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_templates")
        .select(`
          *,
          form_template_versions(*)
        `)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (template) {
      setName(template.name);
      setCategory(template.category);
      setIsActive(template.is_active);

      const versions = (template as any).form_template_versions || [];
      const latest = versions.sort((a: any, b: any) => b.version - a.version)[0];
      if (latest) {
        setSchema(latest.schema as TemplateSchema || {});
      }
    }
  }, [template]);

  const versions = ((template as any)?.form_template_versions || [])
    .sort((a: any, b: any) => b.version - a.version);
  const latestVersion = versions[0];

  // Save template metadata
  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("form_templates")
        .update({ name, category, is_active: isActive })
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-template", id] });
      toast.success("Template saved");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Publish new version
  const publishMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error("Not authenticated");

      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      const { error } = await supabase
        .from("form_template_versions")
        .insert({
          template_id: id!,
          version: nextVersion,
          schema: schema as any,
          notes: versionNotes || `Version ${nextVersion}`,
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-template", id] });
      setPublishOpen(false);
      setVersionNotes("");
      toast.success("New version published");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Monthly Grid helpers
  const addCheckpoint = () => {
    const gc = schema.gridConfig || { checkpoints: [], cellFields: [] };
    gc.checkpoints.push({ time: "12:00", label: "12:00" });
    setSchema({ ...schema, gridConfig: gc });
  };

  const removeCheckpoint = (idx: number) => {
    const gc = { ...schema.gridConfig! };
    gc.checkpoints.splice(idx, 1);
    setSchema({ ...schema, gridConfig: gc });
  };

  const updateCheckpoint = (idx: number, field: string, value: string) => {
    const gc = { ...schema.gridConfig! };
    (gc.checkpoints[idx] as any)[field] = value;
    if (field === "time") gc.checkpoints[idx].label = value;
    setSchema({ ...schema, gridConfig: gc });
  };

  const addCellField = () => {
    const gc = schema.gridConfig || { checkpoints: [], cellFields: [] };
    gc.cellFields.push({ key: `field_${Date.now()}`, type: "text", label: "New Field" });
    setSchema({ ...schema, gridConfig: gc });
  };

  // Event Log helpers
  const addColumn = () => {
    const cols = schema.columns || [];
    cols.push({ key: `col_${Date.now()}`, type: "text", label: "New Column" });
    setSchema({ ...schema, columns: cols });
  };

  const removeColumn = (idx: number) => {
    const cols = [...(schema.columns || [])];
    cols.splice(idx, 1);
    setSchema({ ...schema, columns: cols });
  };

  const updateColumn = (idx: number, updates: Partial<ColumnDef>) => {
    const cols = [...(schema.columns || [])];
    cols[idx] = { ...cols[idx], ...updates };
    setSchema({ ...schema, columns: cols });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!template) {
    return <div className="container mx-auto py-6">Template not found</div>;
  }

  const isMonthlyGrid = template.type === "monthly_grid";

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/qr-forms/templates")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-bold h-auto py-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (name.trim()) {
                      saveMutation.mutate();
                      setIsEditingName(false);
                    }
                  } else if (e.key === 'Escape') {
                    setName(template?.name || '');
                    setIsEditingName(false);
                  }
                }}
              />
              <Button
                size="sm"
                onClick={() => {
                  if (name.trim()) {
                    saveMutation.mutate();
                    setIsEditingName(false);
                  }
                }}
                disabled={!name.trim() || saveMutation.isPending}
              >
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setName(template?.name || ''); setIsEditingName(false); }}>
                Cancel
              </Button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
              onClick={() => setIsEditingName(true)}
              title="Click to edit name"
            >
              {name || "Edit Template"}
              <Edit2 className="h-4 w-4 text-muted-foreground" />
            </h1>
          )}
          <p className="text-muted-foreground text-sm">
            {isMonthlyGrid ? "Monthly Grid" : "Event Log"} • v{latestVersion?.version || 1}
          </p>
        </div>
        <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Publish New Version</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish Version {(latestVersion?.version || 0) + 1}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Change Notes</Label>
                <Textarea
                  value={versionNotes}
                  onChange={(e) => setVersionNotes(e.target.value)}
                  placeholder="What changed in this version?"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending}
              >
                {publishMutation.isPending ? "Publishing..." : "Publish Version"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <Tabs defaultValue="schema">
        <TabsList>
          <TabsTrigger value="schema">Form Builder</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
        </TabsList>

        {/* Schema / Form Builder */}
        <TabsContent value="schema" className="space-y-4">
          {isMonthlyGrid ? (
            <>
              {/* Grid Checkpoints */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Checkpoints (Time Slots)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schema.gridConfig?.checkpoints?.map((cp, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={cp.time}
                        onChange={(e) => updateCheckpoint(idx, "time", e.target.value)}
                        className="w-32"
                      />
                      <Input
                        value={cp.label}
                        onChange={(e) => updateCheckpoint(idx, "label", e.target.value)}
                        placeholder="Label"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCheckpoint(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )) || null}
                  <Button variant="outline" size="sm" onClick={addCheckpoint}>
                    <Plus className="h-4 w-4 mr-2" /> Add Checkpoint
                  </Button>
                </CardContent>
              </Card>

              {/* Cell Fields */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Fields per Cell</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schema.gridConfig?.cellFields?.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-3 flex-wrap">
                      <Input
                        value={field.label}
                        onChange={(e) => {
                          const gc = { ...schema.gridConfig! };
                          gc.cellFields[idx].label = e.target.value;
                          setSchema({ ...schema, gridConfig: gc });
                        }}
                        placeholder="Field label"
                        className="w-40"
                      />
                      <Select
                        value={field.type}
                        onValueChange={(v) => {
                          const gc = { ...schema.gridConfig! };
                          gc.cellFields[idx].type = v;
                          setSchema({ ...schema, gridConfig: gc });
                        }}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((ft) => (
                            <SelectItem key={ft.value} value={ft.value}>
                              {ft.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={field.unit || ""}
                        onChange={(e) => {
                          const gc = { ...schema.gridConfig! };
                          gc.cellFields[idx].unit = e.target.value;
                          setSchema({ ...schema, gridConfig: gc });
                        }}
                        placeholder="Unit"
                        className="w-20"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const gc = { ...schema.gridConfig! };
                          gc.cellFields.splice(idx, 1);
                          setSchema({ ...schema, gridConfig: gc });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )) || null}
                  <Button variant="outline" size="sm" onClick={addCellField}>
                    <Plus className="h-4 w-4 mr-2" /> Add Cell Field
                  </Button>
                </CardContent>
              </Card>

              {/* Recommended Range */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recommended Range</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <div>
                    <Label>Min</Label>
                    <Input
                      type="number"
                      value={schema.recommendedRange?.min ?? ""}
                      onChange={(e) =>
                        setSchema({
                          ...schema,
                          recommendedRange: {
                            ...schema.recommendedRange!,
                            min: Number(e.target.value),
                          },
                        })
                      }
                      className="w-24"
                    />
                  </div>
                  <div>
                    <Label>Max</Label>
                    <Input
                      type="number"
                      value={schema.recommendedRange?.max ?? ""}
                      onChange={(e) =>
                        setSchema({
                          ...schema,
                          recommendedRange: {
                            ...schema.recommendedRange!,
                            max: Number(e.target.value),
                          },
                        })
                      }
                      className="w-24"
                    />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Input
                      value={schema.recommendedRange?.unit ?? "°C"}
                      onChange={(e) =>
                        setSchema({
                          ...schema,
                          recommendedRange: {
                            ...schema.recommendedRange!,
                            unit: e.target.value,
                          },
                        })
                      }
                      className="w-20"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Event Log Columns */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Columns</CardTitle>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Max rows:</Label>
                      <Input
                        type="number"
                        value={schema.maxRows ?? 12}
                        onChange={(e) => setSchema({ ...schema, maxRows: Number(e.target.value) })}
                        className="w-20"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schema.columns?.map((col, idx) => (
                    <Card key={idx} className="p-3">
                      <div className="flex items-start gap-3 flex-wrap">
                        <GripVertical className="h-4 w-4 text-muted-foreground mt-3" />
                        <div className="space-y-2 flex-1 min-w-[200px]">
                          <div className="flex gap-2">
                            <Input
                              value={col.label}
                              onChange={(e) => updateColumn(idx, { label: e.target.value })}
                              placeholder="Column label"
                            />
                            <Select
                              value={col.type}
                              onValueChange={(v) => updateColumn(idx, { type: v })}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_TYPES.map((ft) => (
                                  <SelectItem key={ft.value} value={ft.value}>
                                    {ft.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Input
                              value={col.unit || ""}
                              onChange={(e) => updateColumn(idx, { unit: e.target.value })}
                              placeholder="Unit"
                              className="w-20"
                            />
                            <div className="flex items-center gap-1">
                              <Switch
                                checked={col.required ?? false}
                                onCheckedChange={(v) => updateColumn(idx, { required: v })}
                              />
                              <Label className="text-xs">Required</Label>
                            </div>
                            {col.type === "select" && (
                              <Input
                                value={col.options?.join(", ") || ""}
                                onChange={(e) =>
                                  updateColumn(idx, {
                                    options: e.target.value.split(",").map((s) => s.trim()),
                                  })
                                }
                                placeholder="Options (comma-separated)"
                                className="flex-1"
                              />
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeColumn(idx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  )) || null}
                  <Button variant="outline" size="sm" onClick={addColumn}>
                    <Plus className="h-4 w-4 mr-2" /> Add Column
                  </Button>
                </CardContent>
              </Card>

              {/* Compliance Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Compliance Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {schema.complianceNotes?.map((note, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={note}
                        onChange={(e) => {
                          const notes = [...(schema.complianceNotes || [])];
                          notes[idx] = e.target.value;
                          setSchema({ ...schema, complianceNotes: notes });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const notes = [...(schema.complianceNotes || [])];
                          notes.splice(idx, 1);
                          setSchema({ ...schema, complianceNotes: notes });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )) || null}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSchema({
                        ...schema,
                        complianceNotes: [...(schema.complianceNotes || []), ""],
                      })
                    }
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add Note
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div>
                <Label>Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      { value: "temperature", label: "Temperature" },
                      { value: "hygiene", label: "Hygiene" },
                      { value: "traceability", label: "Traceability" },
                      { value: "oil", label: "Oil" },
                      { value: "other", label: "Other" },
                    ].map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isActive} onCheckedChange={setIsActive} />
                <Label>Active</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions */}
        <TabsContent value="versions" className="space-y-4">
          {versions.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Version {v.version}</span>
                    {v.is_active && <Badge>Active</Badge>}
                    {v.id === latestVersion?.id && (
                      <Badge variant="outline">Latest</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{v.notes || "No notes"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
