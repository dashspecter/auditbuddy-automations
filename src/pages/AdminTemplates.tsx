import { useState } from 'react';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Copy, Trash2 } from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateTemplate } from '@/hooks/useTemplates';
import { toast } from 'sonner';

const AdminTemplates = () => {
  const { data: templates, isLoading } = useTemplates();
  const createTemplate = useCreateTemplate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: 'location' as 'location' | 'staff',
    is_global: true,
    location: '',
  });

  const handleCreate = async () => {
    try {
      const template = await createTemplate.mutateAsync({
        ...formData,
        is_active: true,
      });
      toast.success('Template created successfully!');
      setIsCreateOpen(false);
      setFormData({
        name: '',
        description: '',
        template_type: 'location',
        is_global: true,
        location: '',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Audit Templates</h1>
              <p className="text-muted-foreground mt-1">Manage audit templates and custom fields</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/admin/users">
                  <Settings className="h-4 w-4" />
                  User Management
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/admin/template-library">
                  <Copy className="h-4 w-4" />
                  Template Library
                </Link>
              </Button>
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    New Template
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
                      onValueChange={(value: 'location') =>
                        setFormData({ ...formData, template_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="location">Location Audit</SelectItem>
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
                      <Label htmlFor="location">Specific Location</Label>
                      <Select
                        value={formData.location}
                        onValueChange={(value) => setFormData({ ...formData, location: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LBFC Amzei">LBFC Amzei</SelectItem>
                          <SelectItem value="LBFC Mosilor">LBFC Mosilor</SelectItem>
                          <SelectItem value="LBFC Timpuri Noi">LBFC Timpuri Noi</SelectItem>
                          <SelectItem value="LBFC Apaca">LBFC Apaca</SelectItem>
                        </SelectContent>
                      </Select>
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

          {isLoading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading templates...</p>
            </div>
          ) : templates && templates.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground mb-4">No templates created yet</p>
              <Button onClick={() => setIsCreateOpen(true)}>Create your first template</Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates?.map((template) => (
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
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminTemplates;
