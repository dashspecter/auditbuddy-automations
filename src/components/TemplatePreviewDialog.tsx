import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuditField {
  id: string;
  name: string;
  field_type: string;
  is_required: boolean;
}

interface AuditSection {
  id: string;
  name: string;
  description?: string;
  fields: AuditField[];
}

interface TemplatePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;
  templateName?: string;
  sections?: AuditSection[];
}

const getFieldTypeLabel = (type: string) => {
  switch (type) {
    case 'rating':
      return 'Rating (1-5)';
    case 'yesno':
    case 'yes_no':
      return 'Yes/No';
    case 'text':
      return 'Text';
    case 'number':
      return 'Number';
    case 'date':
      return 'Date';
    default:
      return type;
  }
};

export const TemplatePreviewDialog = ({
  open,
  onOpenChange,
  templateId,
  templateName: propTemplateName,
  sections: propSections,
}: TemplatePreviewDialogProps) => {
  // Fetch template data if templateId is provided and sections are not
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['template_preview', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data: template, error: templateError } = await supabase
        .from('audit_templates')
        .select('id, name, description')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: sections, error: sectionsError } = await supabase
        .from('audit_sections')
        .select(`
          id,
          name,
          description,
          display_order,
          audit_fields(id, name, field_type, is_required, display_order)
        `)
        .eq('template_id', templateId)
        .order('display_order');

      if (sectionsError) throw sectionsError;

      // Sort fields within each section
      const sortedSections = sections?.map(section => ({
        ...section,
        fields: (section.audit_fields || []).sort((a: any, b: any) => a.display_order - b.display_order)
      })) || [];

      return {
        templateName: template.name,
        sections: sortedSections
      };
    },
    enabled: open && !!templateId && !propSections,
  });

  const templateName = propTemplateName || templateData?.templateName || 'Template';
  const sections = propSections || templateData?.sections || [];

  const totalFields = sections.reduce((acc, section) => acc + (section.fields?.length || 0), 0);
  const requiredFields = sections.reduce(
    (acc, section) => acc + (section.fields?.filter((f: AuditField) => f.is_required).length || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{templateName} - Template Preview</DialogTitle>
          <DialogDescription>
            Review all sections and fields in this template.
          </DialogDescription>
          {!isLoading && (
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{sections.length} Sections</Badge>
              <Badge variant="secondary">{totalFields} Total Fields</Badge>
              <Badge variant="default">{requiredFields} Required</Badge>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : sections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sections configured for this template yet.
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <Card key={section.id} className="p-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="text-muted-foreground">#{sectionIndex + 1}</span>
                      {section.name}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                    )}
                  </div>

                  {section.fields?.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No fields in this section</p>
                  ) : (
                    <div className="space-y-2">
                      {section.fields?.map((field: AuditField, fieldIndex: number) => (
                        <div
                          key={field.id}
                          className="flex items-start justify-between py-2 px-3 rounded-md bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {fieldIndex + 1}. {field.name}
                              </span>
                              {field.is_required && (
                                <Badge variant="destructive" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2">
                            {getFieldTypeLabel(field.field_type)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};
