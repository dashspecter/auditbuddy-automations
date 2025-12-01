import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useAuditTemplate, useCreateAuditTemplate, useUpdateAuditTemplate } from "@/hooks/useAuditTemplates";
import { useAuditSections, useCreateAuditSection, useUpdateAuditSection, useDeleteAuditSection } from "@/hooks/useAuditSections";
import { useAuditFields, useCreateAuditField, useUpdateAuditField, useDeleteAuditField } from "@/hooks/useAuditFields";
import { useLocations } from "@/hooks/useLocations";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const TemplateBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const { data: template } = useAuditTemplate(id);
  const { data: sections } = useAuditSections(id);
  const { data: locations } = useLocations();

  const createTemplate = useCreateAuditTemplate();
  const updateTemplate = useUpdateAuditTemplate();
  const createSection = useCreateAuditSection();
  const createField = useCreateAuditField();

  const [templateData, setTemplateData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    template_type: template?.template_type || "quality",
    is_global: template?.is_global || false,
    location_id: template?.location_id || null,
  });

  const handleSaveTemplate = async () => {
    if (isEditMode && id) {
      await updateTemplate.mutateAsync({ id, ...templateData });
    } else {
      const result = await createTemplate.mutateAsync({
        ...templateData,
        is_active: true,
      });
      navigate(`/audits/templates/${result.id}`);
    }
  };

  const handleAddSection = async () => {
    if (!id) {
      toast.error("Please save the template first");
      return;
    }

    await createSection.mutateAsync({
      template_id: id,
      name: "New Section",
      description: null,
      display_order: sections?.length || 0,
    });
  };

  return (
    <AppLayout>
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
          <Button onClick={handleSaveTemplate}>
            Save Template
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name</Label>
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

            <div className="grid grid-cols-2 gap-4">
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
                    <SelectItem value="quality">Quality</SelectItem>
                    <SelectItem value="safety">Safety</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                    <SelectItem value="hygiene">Hygiene</SelectItem>
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

        {isEditMode && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Sections & Fields</h2>
              <Button onClick={handleAddSection} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>

            {sections && sections.length > 0 ? (
              <Accordion type="single" collapsible className="space-y-4">
                {sections.map((section) => (
                  <SectionItem key={section.id} section={section} />
                ))}
              </Accordion>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <p>No sections yet.</p>
                  <p className="text-sm mt-2">Add sections to structure your audit template.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
};

const SectionItem = ({ section }: { section: any }) => {
  const { data: fields } = useAuditFields(section.id);
  const createField = useCreateAuditField();
  const deleteSection = useDeleteAuditSection();

  const handleAddField = async () => {
    await createField.mutateAsync({
      section_id: section.id,
      name: "New Field",
      field_type: "text",
      is_required: false,
      display_order: fields?.length || 0,
      options: null,
    });
  };

  return (
    <AccordionItem value={section.id}>
      <Card>
        <AccordionTrigger className="hover:no-underline px-6">
          <div className="flex items-center gap-3 flex-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <div className="font-semibold">{section.name}</div>
              {section.description && (
                <div className="text-sm text-muted-foreground">{section.description}</div>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <CardContent className="space-y-4 pt-4">
            <div className="flex justify-between">
              <Button onClick={handleAddField} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
              <Button
                onClick={() => deleteSection.mutate({ id: section.id, template_id: section.template_id })}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Section
              </Button>
            </div>

            <Separator />

            {fields && fields.length > 0 ? (
              <div className="space-y-3">
                {fields.map((field) => (
                  <FieldItem key={field.id} field={field} sectionId={section.id} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No fields yet. Add fields to this section.
              </div>
            )}
          </CardContent>
        </AccordionContent>
      </Card>
    </AccordionItem>
  );
};

const FieldItem = ({ field, sectionId }: { field: any; sectionId: string }) => {
  const deleteField = useDeleteAuditField();

  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="flex-1">
        <div className="font-medium">{field.name}</div>
        <div className="text-sm text-muted-foreground">
          {field.field_type} {field.is_required && "• Required"}
        </div>
      </div>
      <Button
        onClick={() => deleteField.mutate({ id: field.id, section_id: sectionId })}
        size="sm"
        variant="ghost"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default TemplateBuilder;
