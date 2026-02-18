import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Edit2, Check, X, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { useAuditTemplate, useCreateAuditTemplate, useUpdateAuditTemplate } from "@/hooks/useAuditTemplates";
import { useAuditSections, useCreateAuditSection, useUpdateAuditSection, useDeleteAuditSection } from "@/hooks/useAuditSections";
import { useAuditFields, useCreateAuditField, useUpdateAuditField, useDeleteAuditField } from "@/hooks/useAuditFields";
import { useLocations } from "@/hooks/useLocations";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Field type options available
const FIELD_TYPES = [
  { value: "rating", label: "Rating (1-5)", description: "5-point scale for scoring" },
  { value: "checkbox", label: "Checkbox", description: "Yes/No toggle" },
  { value: "text", label: "Text", description: "Short text input" },
  { value: "textarea", label: "Long Text", description: "Multi-line text" },
  { value: "number", label: "Number", description: "Numeric input" },
  { value: "select", label: "Dropdown", description: "Single choice from options" },
  { value: "multiselect", label: "Multi-Select", description: "Multiple choices" },
  { value: "date", label: "Date", description: "Date picker" },
  { value: "time", label: "Time", description: "Time picker" },
  { value: "photo", label: "Photo", description: "Camera/image capture" },
];

const TemplateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: template, isLoading: templateLoading } = useAuditTemplate(id);
  const { data: sections, refetch: refetchSections } = useAuditSections(id);
  const { data: locations } = useLocations();

  const createTemplate = useCreateAuditTemplate();
  const updateTemplate = useUpdateAuditTemplate();
  const createSection = useCreateAuditSection();

  const STORAGE_KEY = "template_builder_draft";

  const [templateData, setTemplateData] = useState(() => {
    // For new templates, try to restore from sessionStorage
    if (!id) {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Invalid JSON, use defaults
        }
      }
    }
    return {
      name: "",
      description: "",
      template_type: "location",
      is_global: true,
      location_id: null as string | null,
    };
  });

  const [isSaving, setIsSaving] = useState(false);

  // Evidence policy state
  const { user } = useAuth();
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [reviewRequired, setReviewRequired] = useState(false);
  const [evidenceInstructions, setEvidenceInstructions] = useState("");
  const [evidencePolicyId, setEvidencePolicyId] = useState<string | null>(null);

  // Load existing evidence policy when editing
  useEffect(() => {
    if (!id) return;
    supabase
      .from("evidence_policies")
      .select("*")
      .eq("applies_to", "audit_template")
      .eq("applies_id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEvidencePolicyId(data.id);
          setEvidenceRequired(data.evidence_required);
          setReviewRequired(data.review_required);
          setEvidenceInstructions(data.instructions ?? "");
        }
      });
  }, [id]);

  // Save to sessionStorage when form data changes (only for new templates)
  useEffect(() => {
    if (!isEditMode) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(templateData));
    }
  }, [templateData, isEditMode]);

  // Update form when template data loads (edit mode)
  useEffect(() => {
    if (template) {
      setTemplateData({
        name: template.name || "",
        description: template.description || "",
        template_type: template.template_type || "location",
        is_global: template.is_global ?? true,
        location_id: template.location_id || null,
      });
    }
  }, [template]);

  // Clear sessionStorage when navigating to edit mode (template was saved)
  useEffect(() => {
    if (isEditMode) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [isEditMode]);

  const handleSaveTemplate = async () => {
    if (!templateData.name.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    setIsSaving(true);
    try {
      let savedId = id;
      if (isEditMode && id) {
        await updateTemplate.mutateAsync({ id, ...templateData });
        toast.success("Template updated");
      } else {
        const result = await createTemplate.mutateAsync({ ...templateData, is_active: true });
        savedId = result.id;
        toast.success("Template created! Now add sections and fields.");
        navigate(`/audits/templates/${result.id}`);
      }

      // Save/delete evidence policy
      if (savedId && user?.id) {
        const { data: cu } = await supabase.from("company_users").select("company_id").eq("user_id", user.id).single();
        if (cu?.company_id) {
          if (evidenceRequired) {
            await supabase.from("evidence_policies").upsert({
              ...(evidencePolicyId ? { id: evidencePolicyId } : {}),
              company_id: cu.company_id,
              applies_to: "audit_template",
              applies_id: savedId,
              evidence_required: true,
              review_required: reviewRequired,
              min_media_count: 1,
              required_media_types: ["photo"],
              instructions: evidenceInstructions.trim() || null,
            }, { onConflict: "company_id,applies_to,applies_id" });
          } else if (evidencePolicyId) {
            await supabase.from("evidence_policies").delete().eq("id", evidencePolicyId);
            setEvidencePolicyId(null);
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSection = async () => {
    if (!id) {
      toast.error("Please save the template first to add sections");
      return;
    }

    try {
      await createSection.mutateAsync({
        template_id: id,
        name: "New Section",
        description: "",
        display_order: sections?.length || 0,
      });
      toast.success("Section added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add section");
    }
  };

  if (templateLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditMode ? "Edit Template" : "Create Template"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Build your audit template with sections and fields
          </p>
        </div>
        <Button onClick={handleSaveTemplate} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={templateData.name}
              onChange={(e) => setTemplateData({ ...templateData, name: e.target.value })}
              placeholder="e.g., Daily Kitchen Audit"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={templateData.description || ""}
              onChange={(e) => setTemplateData({ ...templateData, description: e.target.value })}
              placeholder="Describe the purpose of this audit..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Template Type</Label>
              <Select
                value={templateData.template_type}
                onValueChange={(value) => setTemplateData({ ...templateData, template_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="location">Location Audit</SelectItem>
                  <SelectItem value="staff">Staff Audit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location (optional)</Label>
              <Select
                value={templateData.location_id || "global"}
                onValueChange={(value) => setTemplateData({ 
                  ...templateData, 
                  location_id: value === "global" ? null : value,
                  is_global: value === "global"
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (All Locations)</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evidence / Proof Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            Evidence / Proof Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Require proof photo</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Auditors must attach a photo before completing this audit</p>
            </div>
            <Switch checked={evidenceRequired} onCheckedChange={setEvidenceRequired} />
          </div>
          {evidenceRequired && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Also require review</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">A manager must approve the proof before audit is finalised</p>
                </div>
                <Switch checked={reviewRequired} onCheckedChange={setReviewRequired} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Instructions for auditor <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="e.g. Take a photo of the kitchen area showing cleanliness..."
                  rows={2}
                  value={evidenceInstructions}
                  onChange={(e) => setEvidenceInstructions(e.target.value)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Show sections builder - inform user to save first if new template */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sections & Fields</CardTitle>
          <Button onClick={handleAddSection} variant="outline" disabled={!isEditMode}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </CardHeader>
        <CardContent>
          {!isEditMode ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">Save the template first</p>
              <p className="text-sm mt-2">Click "Save Template" above to create the template, then you can add sections and fields.</p>
            </div>
          ) : sections && sections.length > 0 ? (
            <div className="space-y-4">
              {sections
                .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                .map((section, index) => (
                  <SectionItem key={section.id} section={section} index={index} />
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium">No sections yet</p>
              <p className="text-sm mt-2">Add sections to structure your audit. Each section can contain multiple fields.</p>
              <Button onClick={handleAddSection} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add First Section
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const SectionItem = ({ section, index }: { section: any; index: number }) => {
  const { data: fields, refetch: refetchFields } = useAuditFields(section.id);
  const createField = useCreateAuditField();
  const deleteSection = useDeleteAuditSection();
  const updateSection = useUpdateAuditSection();

  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(section.name);
  const [editDescription, setEditDescription] = useState(section.description || "");

  const handleAddField = async () => {
    try {
      await createField.mutateAsync({
        section_id: section.id,
        name: "New Field",
        field_type: "rating",
        is_required: true,
        display_order: fields?.length || 0,
        options: null,
      });
      toast.success("Field added");
    } catch (error: any) {
      toast.error(error.message || "Failed to add field");
    }
  };

  const handleSaveSection = async () => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        template_id: section.template_id,
        name: editName,
        description: editDescription || null,
      });
      setIsEditing(false);
      toast.success("Section updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update section");
    }
  };

  const handleDeleteSection = async () => {
    if (!confirm("Delete this section and all its fields?")) return;
    try {
      await deleteSection.mutateAsync({ id: section.id, template_id: section.template_id });
      toast.success("Section deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete section");
    }
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 p-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-1">
              {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
            </Button>
          </CollapsibleTrigger>
          
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Section name"
                  className="font-semibold"
                />
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description (optional)"
                  className="text-sm"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                  <span className="font-semibold text-lg">{section.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {fields?.length || 0} field{(fields?.length || 0) !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {section.description && (
                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleSaveSection} size="sm" variant="ghost">
                  <Check className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsEditing(false)} size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setIsEditing(true)} size="sm" variant="ghost">
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button onClick={handleDeleteSection} size="sm" variant="ghost" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <CollapsibleContent>
          <Separator />
          <div className="p-4 bg-muted/30 space-y-3">
            {fields && fields.length > 0 ? (
              <>
                {fields
                  .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                  .map((field, idx) => (
                    <FieldItem key={field.id} field={field} sectionId={section.id} index={idx} />
                  ))}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No fields yet. Add fields like ratings, checkboxes, or text inputs.
              </div>
            )}
            
            <Button onClick={handleAddField} size="sm" variant="outline" className="w-full mt-2">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

const FieldItem = ({ field, sectionId, index }: { field: any; sectionId: string; index: number }) => {
  const deleteField = useDeleteAuditField();
  const updateField = useUpdateAuditField();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: field.name,
    field_type: field.field_type,
    is_required: field.is_required,
    options: field.options,
  });
  const [optionsText, setOptionsText] = useState(
    Array.isArray(field.options) ? field.options.join(", ") : ""
  );

  const handleSaveField = async () => {
    try {
      // Parse options if it's a select/multiselect
      let parsedOptions = null;
      if (["select", "multiselect"].includes(editData.field_type) && optionsText.trim()) {
        parsedOptions = optionsText.split(",").map(o => o.trim()).filter(Boolean);
      }

      await updateField.mutateAsync({
        id: field.id,
        section_id: sectionId,
        name: editData.name,
        field_type: editData.field_type,
        is_required: editData.is_required,
        options: parsedOptions,
      });
      setIsEditing(false);
      toast.success("Field updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update field");
    }
  };

  const handleDeleteField = async () => {
    try {
      await deleteField.mutateAsync({ id: field.id, section_id: sectionId });
      toast.success("Field deleted");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete field");
    }
  };

  const fieldTypeInfo = FIELD_TYPES.find(t => t.value === field.field_type);

  if (isEditing) {
    return (
      <Card className="p-4 space-y-3 bg-background">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Field Name</Label>
            <Input
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              placeholder="Field name"
            />
          </div>
          <div>
            <Label className="text-xs">Field Type</Label>
            <Select
              value={editData.field_type}
              onValueChange={(value) => setEditData({ ...editData, field_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span>{type.label}</span>
                      <span className="text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {["select", "multiselect"].includes(editData.field_type) && (
          <div>
            <Label className="text-xs">Options (comma-separated)</Label>
            <Input
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              placeholder="Option 1, Option 2, Option 3"
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={editData.is_required}
              onCheckedChange={(checked) => setEditData({ ...editData, is_required: checked })}
            />
            <Label className="text-sm">Required</Label>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setIsEditing(false)} size="sm" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleSaveField} size="sm">
              Save
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-background border rounded-lg hover:border-primary/50 transition-colors">
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{field.name}</span>
          {field.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {fieldTypeInfo?.label || field.field_type}
          </Badge>
          {Array.isArray(field.options) && field.options.length > 0 && (
            <span className="text-xs truncate max-w-[200px]">
              Options: {field.options.join(", ")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button onClick={() => setIsEditing(true)} size="sm" variant="ghost">
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button onClick={handleDeleteField} size="sm" variant="ghost" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TemplateBuilder;
