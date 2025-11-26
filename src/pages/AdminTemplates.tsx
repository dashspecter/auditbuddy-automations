import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Copy, Trash2, X } from 'lucide-react';
import { useTemplates, useDeleteTemplate } from '@/hooks/useTemplates';
import { Link, useNavigate } from 'react-router-dom';
import { AdminOnly } from '@/components/AdminOnly';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateTemplate } from '@/hooks/useTemplates';
import { toast } from 'sonner';
import { LocationMultiSelector } from '@/components/LocationMultiSelector';
import { LocationSelector } from '@/components/LocationSelector';

const AdminTemplates = () => {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; name: string } | null>(null);
  const [filterLocationId, setFilterLocationId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'location' as 'location' | 'staff',
    is_global: true,
    location_ids: [] as string[],
  });

  const handleCreate = async () => {
    try {
      await createTemplate.mutateAsync({
        name: formData.name,
        description: formData.description,
        template_type: formData.template_type,
        is_global: formData.is_global,
        is_active: true,
        location_ids: formData.is_global ? [] : formData.location_ids,
      });
      toast.success('Template created successfully!');
      navigate('/admin/template-library');
      setIsCreateOpen(false);
      setFormData({
        name: '',
        description: '',
        template_type: 'location',
        is_global: true,
        location_ids: [],
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleDeleteClick = (template: { id: string; name: string }) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!templateToDelete) return;

    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      toast.success('Template deleted successfully');
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  // Calculate template counts per location
  const locationCounts = templates?.reduce((acc, template) => {
    if (template.is_global) return acc;
    
    // Count from old location_id field
    if (template.location_id) {
      acc[template.location_id] = (acc[template.location_id] || 0) + 1;
    }
    
    // Count from new template_locations
    if (template.template_locations) {
      template.template_locations.forEach((tl: any) => {
        acc[tl.location_id] = (acc[tl.location_id] || 0) + 1;
      });
    }
    
    return acc;
  }, {} as Record<string, number>);

  // Filter templates based on selected location
  const filteredTemplates = templates?.filter(template => {
    if (!filterLocationId) return true;
    
    // Check if template is global (should not appear in location filter)
    if (template.is_global) return false;
    
    // Check old location_id field
    if (template.location_id === filterLocationId) return true;
    
    // Check new template_locations (if available)
    if (template.template_locations) {
      return template.template_locations.some((tl: any) => tl.location_id === filterLocationId);
    }
    
    return false;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 px-safe py-8 pb-safe">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Audit Templates</h1>
                <p className="text-muted-foreground mt-1">Manage audit templates and custom fields</p>
              </div>
            <div className="flex flex-wrap gap-2">
              <AdminOnly>
                <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3" asChild>
                  <Link to="/admin/users">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">Users</span>
                  </Link>
                </Button>
              </AdminOnly>
              <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3" asChild>
                <Link to="/admin/template-library">
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Library</span>
                </Link>
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5 px-2 sm:px-3">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">New</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Template</DialogTitle>
                  <DialogDescription>
                    Create a new audit template with custom sections and fields
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Morning Shift Audit"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this template is for..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Template Type *</Label>
                    <Select
                      value={formData.template_type}
                      onValueChange={(value: 'location' | 'staff') =>
                        setFormData({ ...formData, template_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="location">Location Audit</SelectItem>
                        <SelectItem value="staff">Staff Performance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_global">Global Template</Label>
                      <p className="text-sm text-muted-foreground">
                        Available for all locations
                      </p>
                    </div>
                    <Switch
                      id="is_global"
                      checked={formData.is_global}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, is_global: checked })
                      }
                    />
                  </div>
                  {!formData.is_global && (
                    <div className="space-y-2">
                      <Label htmlFor="location">Specific Locations</Label>
                      <LocationMultiSelector
                        value={formData.location_ids}
                        onValueChange={(value) => setFormData({ ...formData, location_ids: value })}
                        placeholder="Select one or more locations"
                      />
                      <p className="text-xs text-muted-foreground">
                        Select multiple locations to assign this template to
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={!formData.name || createTemplate.isPending}>
                    {createTemplate.isPending ? 'Creating...' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </div>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-2">
              <div className="w-64">
                <LocationSelector
                  value={filterLocationId}
                  onValueChange={setFilterLocationId}
                  placeholder="Filter by location"
                  locationCounts={locationCounts}
                />
              </div>
              {filterLocationId && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setFilterLocationId('')}
                  className="h-10 w-10"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          ) : filteredTemplates && filteredTemplates.length === 0 && !filterLocationId ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No templates created yet</p>
              <Button onClick={() => setIsCreateOpen(true)}>Create your first template</Button>
            </Card>
          ) : filteredTemplates && filteredTemplates.length === 0 && filterLocationId ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No templates found for this location</p>
              <Button variant="outline" onClick={() => setFilterLocationId('')}>Clear filter</Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates?.map((template) => (
                <Card key={template.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">{template.template_type}</Badge>
                    {template.is_global ? (
                      <Badge>Global</Badge>
                    ) : (
                      <Badge variant="secondary">{template.location}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/admin/templates/${template.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Settings className="h-4 w-4" />
                        Configure
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => handleDeleteClick({ id: template.id, name: template.name })}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone and will remove all sections, fields, and audits associated with this template.
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
};

export default AdminTemplates;
