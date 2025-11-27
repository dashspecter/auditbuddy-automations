import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Copy, Eye, Search, Rocket, Edit, Trash2, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteTemplate } from "@/hooks/useTemplates";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { TemplatePreviewDialog } from "@/components/TemplatePreviewDialog";

interface Template {
  id: string;
  name: string;
  description?: string;
  template_type: string;
  is_global: boolean;
  created_by: string;
}

interface TemplateWithDetails extends Template {
  sections: Array<{
    id: string;
    name: string;
    description?: string;
    display_order: number;
    fields: Array<{
      id: string;
      name: string;
      field_type: string;
      is_required: boolean;
      display_order: number;
      options?: any;
    }>;
  }>;
}

export default function TemplateLibrary() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: roleData } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "location" | "staff">("all");
  const [previewTemplate, setPreviewTemplate] = useState<TemplateWithDetails | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  
  const deleteTemplateMutation = useDeleteTemplate();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['template_library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Template[];
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!user) throw new Error('User not authenticated');

      // Fetch the original template with all sections and fields
      const { data: originalTemplate, error: templateError } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      // Fetch sections
      const { data: sections, error: sectionsError } = await supabase
        .from('audit_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order');

      if (sectionsError) throw sectionsError;

      // Fetch all fields for all sections
      const sectionIds = sections.map(s => s.id);
      const { data: fields, error: fieldsError } = await supabase
        .from('audit_fields')
        .select('*')
        .in('section_id', sectionIds)
        .order('display_order');

      if (fieldsError) throw fieldsError;

      // Create new template
      const { data: newTemplate, error: newTemplateError } = await supabase
        .from('audit_templates')
        .insert({
          name: `${originalTemplate.name} (Copy)`,
          description: originalTemplate.description,
          template_type: originalTemplate.template_type,
          is_global: false,
          location: originalTemplate.location,
          created_by: user.id,
          is_active: true,
        })
        .select()
        .single();

      if (newTemplateError) throw newTemplateError;

      // Create new sections with mapping
      const sectionMapping: Record<string, string> = {};
      for (const section of sections) {
        const { data: newSection, error: newSectionError } = await supabase
          .from('audit_sections')
          .insert({
            template_id: newTemplate.id,
            name: section.name,
            description: section.description,
            display_order: section.display_order,
          })
          .select()
          .single();

        if (newSectionError) throw newSectionError;
        sectionMapping[section.id] = newSection.id;
      }

      // Create new fields
      const newFields = fields.map(field => ({
        section_id: sectionMapping[field.section_id],
        name: field.name,
        field_type: field.field_type,
        is_required: field.is_required,
        display_order: field.display_order,
        options: field.options,
      }));

      const { error: fieldsInsertError } = await supabase
        .from('audit_fields')
        .insert(newFields);

      if (fieldsInsertError) throw fieldsInsertError;

      return newTemplate;
    },
    onSuccess: (newTemplate) => {
      queryClient.invalidateQueries({ queryKey: ['audit_templates'] });
      toast.success('Template duplicated successfully!');
      navigate(`/admin/templates/${newTemplate.id}`);
    },
    onError: (error) => {
      console.error('Error duplicating template:', error);
      toast.error('Failed to duplicate template');
    },
  });

  const handlePreview = async (templateId: string) => {
    try {
      const { data: template, error: templateError } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;

      const { data: sections, error: sectionsError } = await supabase
        .from('audit_sections')
        .select('*')
        .eq('template_id', templateId)
        .order('display_order');

      if (sectionsError) throw sectionsError;

      const sectionsWithFields = await Promise.all(
        sections.map(async (section) => {
          const { data: fields, error: fieldsError } = await supabase
            .from('audit_fields')
            .select('*')
            .eq('section_id', section.id)
            .order('display_order');

          if (fieldsError) throw fieldsError;

          return {
            ...section,
            fields: fields || [],
          };
        })
      );

      setPreviewTemplate({
        ...template,
        sections: sectionsWithFields,
      });
    } catch (error) {
      console.error('Error loading template preview:', error);
      toast.error('Failed to load template preview');
    }
  };

  const handleQuickUse = (templateId: string) => {
    navigate(`/location-audit?template=${templateId}`);
  };

  const handleEdit = (templateId: string) => {
    navigate(`/admin/templates/${templateId}`);
  };

  const handleDeleteClick = (template: Template) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplateMutation.mutateAsync(templateToDelete.id);
      toast.success('Template deleted successfully');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const canEditTemplate = (template: Template) => {
    return roleData?.isAdmin || template.created_by === user?.id;
  };

  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || template.template_type === selectedType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 px-safe py-8 pb-safe">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading template library...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 px-safe py-8 pb-safe">
        <div className="flex items-center gap-2 mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/admin/templates")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Audit Templates
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/audits")}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            View All Audits
          </Button>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Template Library</h1>
            <p className="text-muted-foreground">
              Browse and duplicate pre-built industry-standard audit templates
            </p>
          </div>
          <Button
            onClick={() => navigate("/location-audit")}
            className="gap-2"
          >
            + New Location Audit
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates?.map((template) => (
            <Card key={template.id} className="p-6 flex flex-col">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">{template.name}</h3>
                  <div className="flex gap-2">
                    <Badge variant={template.template_type === 'location' ? 'default' : 'secondary'}>
                      {template.template_type}
                    </Badge>
                    {template.is_global && (
                      <Badge variant="outline" className="bg-primary/10 border-primary/30">
                        Global
                      </Badge>
                    )}
                  </div>
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {template.description}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => handleQuickUse(template.id)}
                  className="flex-1 gap-2"
                >
                  <Rocket className="h-4 w-4" />
                  Quick Use
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(template.id)}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicateTemplateMutation.mutate(template.id)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {canEditTemplate(template) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(template.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!template.is_global && (
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(template)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>

        {filteredTemplates?.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No templates found matching your search.</p>
          </Card>
        )}

        {previewTemplate && (
          <TemplatePreviewDialog
            open={!!previewTemplate}
            onOpenChange={(open) => !open && setPreviewTemplate(null)}
            templateName={previewTemplate.name}
            sections={previewTemplate.sections}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone and will remove all sections and fields associated with this template.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
