import { useState } from "react";
import { 
  useRoleTemplates, 
  useRoleTemplatePermissions, 
  useCreateRoleTemplate, 
  useToggleTemplatePermission,
  useTemplateAssignments,
  RoleTemplate 
} from "@/hooks/useRoleTemplates";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Users, Lock, ChevronRight, Copy } from "lucide-react";

const RESOURCES = [
  'employees', 'shifts', 'attendance', 'audits', 'locations',
  'equipment', 'documents', 'notifications', 'reports', 'tests',
  'integrations', 'company_settings', 'billing', 'users'
];

const ACTIONS = ['view', 'create', 'update', 'delete', 'manage', 'approve'];

const formatName = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const RoleTemplates = () => {
  const { data: templates = [], isLoading } = useRoleTemplates();
  const { data: assignments = [] } = useTemplateAssignments();
  const createTemplate = useCreateRoleTemplate();
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [baseTemplateId, setBaseTemplateId] = useState<string>("none");
  const [createOpen, setCreateOpen] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createTemplate.mutate({ 
      name: newName, 
      description: newDesc, 
      baseTemplateId: baseTemplateId !== "none" ? baseTemplateId : undefined 
    }, {
      onSuccess: () => {
        setCreateOpen(false);
        setNewName("");
        setNewDesc("");
        setBaseTemplateId("none");
      }
    });
  };

  const getAssignmentCount = (templateId: string) => 
    assignments.filter(a => a.template_id === templateId).length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Role Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Define permission bundles and assign them to users
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Role Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                placeholder="Template name (e.g. Regional Manager)" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
              />
              <Textarea 
                placeholder="Description" 
                value={newDesc} 
                onChange={(e) => setNewDesc(e.target.value)} 
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Copy permissions from
                </label>
                <Select value={baseTemplateId} onValueChange={setBaseTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start from scratch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Start from scratch</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {t.is_system ? '(System)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!newName.trim() || createTemplate.isPending}>
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Templates</h3>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 pr-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTemplate?.id === template.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {template.is_system && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {template.is_system && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {getAssignmentCount(template.id)} assigned
                      </span>
                    </div>
                    {template.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{template.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <PermissionMatrix template={selectedTemplate} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[600px] text-muted-foreground">
                <div className="text-center">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Select a role template to view permissions</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

const PermissionMatrix = ({ template }: { template: RoleTemplate }) => {
  const { data: permissions = [], isLoading } = useRoleTemplatePermissions(template.id);
  const togglePermission = useToggleTemplatePermission();
  const { data: company } = useCompany();

  const isOwner = company?.userRole === 'company_owner';
  const canEdit = !template.is_system || isOwner;

  const hasPermission = (resource: string, action: string) =>
    permissions.some(p => p.resource === resource && p.action === action && p.granted);

  const handleToggle = (resource: string, action: string, current: boolean) => {
    if (!canEdit) return;
    togglePermission.mutate({
      templateId: template.id,
      resource,
      action,
      granted: !current,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {template.name}
              {template.is_system && <Badge variant="secondary">System</Badge>}
            </CardTitle>
            <CardDescription>{template.description || 'No description'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading permissions...</p>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Resource</th>
                    {ACTIONS.map(action => (
                      <th key={action} className="text-center py-2 px-2 font-medium text-muted-foreground capitalize">
                        {action}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RESOURCES.map(resource => (
                    <tr key={resource} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-medium">{formatName(resource)}</td>
                      {ACTIONS.map(action => {
                        const granted = hasPermission(resource, action);
                        return (
                          <td key={action} className="text-center py-2.5 px-2">
                            <Switch
                              checked={granted}
                              onCheckedChange={() => handleToggle(resource, action, granted)}
                              disabled={!canEdit}
                              className="scale-75"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
        {template.is_system && !isOwner && (
          <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
            <Lock className="h-3 w-3" />
            System templates are read-only. Create a custom template to modify permissions.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RoleTemplates;
