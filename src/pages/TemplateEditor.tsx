import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Edit2,
} from 'lucide-react';
import {
  useTemplate,
  useTemplateSections,
  useCreateSection,
  useUpdateSection,
  useDeleteSection,
  useCreateField,
  useUpdateField,
  useDeleteField,
  useSectionFields,
} from '@/hooks/useTemplates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const TemplateEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: template, isLoading: templateLoading } = useTemplate(id || '');
  const { data: sections, isLoading: sectionsLoading } = useTemplateSections(id || '');
  
  const createSection = useCreateSection();
  const updateSection = useUpdateSection();
  const deleteSection = useDeleteSection();
  
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState({
    name: '',
    description: '',
  });

  const handleCreateSection = async () => {
    if (!id) return;
    
    try {
      const maxOrder = sections?.length ? Math.max(...sections.map(s => s.display_order)) : -1;
      await createSection.mutateAsync({
        template_id: id,
        name: sectionForm.name,
        description: sectionForm.description,
        display_order: maxOrder + 1,
      });
      toast.success('Section created successfully!');
      setIsSectionDialogOpen(false);
      setSectionForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating section:', error);
      toast.error('Failed to create section');
    }
  };

  const handleUpdateSection = async () => {
    if (!editingSection) return;
    
    try {
      await updateSection.mutateAsync({
        id: editingSection.id,
        name: sectionForm.name,
        description: sectionForm.description,
      });
      toast.success('Section updated successfully!');
      setEditingSection(null);
      setIsSectionDialogOpen(false);
      setSectionForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section? All fields will be deleted.')) return;
    
    try {
      await deleteSection.mutateAsync(sectionId);
      toast.success('Section deleted successfully!');
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  const openEditDialog = (section: any) => {
    setEditingSection(section);
    setSectionForm({
      name: section.name,
      description: section.description || '',
    });
    setIsSectionDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingSection(null);
    setSectionForm({ name: '', description: '' });
    setIsSectionDialogOpen(true);
  };

  if (templateLoading || sectionsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading template...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Template Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested template could not be found.</p>
            <Button onClick={() => navigate('/admin/templates')}>Back to Templates</Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/admin/templates')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-foreground">{template.name}</h1>
              <p className="text-muted-foreground mt-1">Configure sections and fields</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">{template.template_type}</Badge>
              {template.is_global ? (
                <Badge>Global</Badge>
              ) : (
                <Badge variant="secondary">{template.location}</Badge>
              )}
            </div>
          </div>

          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-foreground">Sections</h2>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
            </div>

            {!sections || sections.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No sections yet</p>
                <Button onClick={openCreateDialog}>Add your first section</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sections.map((section) => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    onEdit={() => openEditDialog(section)}
                    onDelete={() => handleDeleteSection(section.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>
      </main>

      <Dialog open={isSectionDialogOpen} onOpenChange={setIsSectionDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSection ? 'Edit Section' : 'Create New Section'}</DialogTitle>
            <DialogDescription>
              {editingSection ? 'Update section details' : 'Add a new section to this template'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="section-name">Section Name *</Label>
              <Input
                id="section-name"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                placeholder="e.g., Compliance Check"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="section-description">Description</Label>
              <Input
                id="section-description"
                value={sectionForm.description}
                onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingSection ? handleUpdateSection : handleCreateSection}
              disabled={!sectionForm.name}
            >
              {editingSection ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SectionCard = ({ section, onEdit, onDelete }: any) => {
  const { data: fields } = useSectionFields(section.id);
  const createField = useCreateField();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();
  
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [fieldForm, setFieldForm] = useState({
    name: '',
    field_type: 'rating' as 'rating' | 'yesno' | 'text' | 'number' | 'date',
    is_required: false,
  });

  const handleCreateField = async () => {
    try {
      const maxOrder = fields?.length ? Math.max(...fields.map(f => f.display_order)) : -1;
      await createField.mutateAsync({
        section_id: section.id,
        name: fieldForm.name,
        field_type: fieldForm.field_type,
        is_required: fieldForm.is_required,
        display_order: maxOrder + 1,
      });
      toast.success('Field created successfully!');
      setIsFieldDialogOpen(false);
      setFieldForm({ name: '', field_type: 'rating', is_required: false });
    } catch (error) {
      console.error('Error creating field:', error);
      toast.error('Failed to create field');
    }
  };

  const handleUpdateField = async () => {
    if (!editingField) return;
    
    try {
      await updateField.mutateAsync({
        id: editingField.id,
        name: fieldForm.name,
        field_type: fieldForm.field_type,
        is_required: fieldForm.is_required,
      });
      toast.success('Field updated successfully!');
      setEditingField(null);
      setIsFieldDialogOpen(false);
      setFieldForm({ name: '', field_type: 'rating', is_required: false });
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update field');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;
    
    try {
      await deleteField.mutateAsync(fieldId);
      toast.success('Field deleted successfully!');
    } catch (error) {
      console.error('Error deleting field:', error);
      toast.error('Failed to delete field');
    }
  };

  const openEditFieldDialog = (field: any) => {
    setEditingField(field);
    setFieldForm({
      name: field.name,
      field_type: field.field_type,
      is_required: field.is_required,
    });
    setIsFieldDialogOpen(true);
  };

  const openCreateFieldDialog = () => {
    setEditingField(null);
    setFieldForm({ name: '', field_type: 'rating', is_required: false });
    setIsFieldDialogOpen(true);
  };

  return (
    <>
      <Card className="p-4 bg-secondary/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
            <div>
              <h3 className="font-semibold text-foreground">{section.name}</h3>
              {section.description && (
                <p className="text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {fields && fields.length > 0 ? (
            fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {field.name}
                      {field.is_required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{field.field_type}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditFieldDialog(field)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No fields yet</p>
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full gap-2" onClick={openCreateFieldDialog}>
          <Plus className="h-3 w-3" />
          Add Field
        </Button>
      </Card>

      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingField ? 'Edit Field' : 'Create New Field'}</DialogTitle>
            <DialogDescription>
              {editingField ? 'Update field details' : 'Add a new field to this section'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Field Name *</Label>
              <Input
                id="field-name"
                value={fieldForm.name}
                onChange={(e) => setFieldForm({ ...fieldForm, name: e.target.value })}
                placeholder="e.g., Temperature Control"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type *</Label>
              <Select
                value={fieldForm.field_type}
                onValueChange={(value: any) => setFieldForm({ ...fieldForm, field_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Rating (1-5)</SelectItem>
                  <SelectItem value="yesno">Yes/No</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="field-required">Required Field</Label>
                <p className="text-sm text-muted-foreground">Must be filled to submit</p>
              </div>
              <Switch
                id="field-required"
                checked={fieldForm.is_required}
                onCheckedChange={(checked) => setFieldForm({ ...fieldForm, is_required: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFieldDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={editingField ? handleUpdateField : handleCreateField}
              disabled={!fieldForm.name}
            >
              {editingField ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TemplateEditor;
