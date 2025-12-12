import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useNotificationTemplates } from "@/hooks/useNotificationTemplates";
import { Plus, FileText, Trash2, Pencil, Megaphone, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { RoleGuard } from "@/components/RoleGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function NotificationTemplates() {
  const { data: roleData } = useUserRole();
  const { toast } = useToast();
  const { templates, createTemplate, updateTemplate, deleteTemplate, isCreating, isUpdating } = useNotificationTemplates();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    title: "",
    message: "",
    type: "info" as "info" | "success" | "warning" | "announcement",
    target_roles: [] as string[],
  });

  const handleCreateTemplate = () => {
    if (!formData.name || !formData.title || !formData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    createTemplate(formData, {
      onSuccess: () => {
        toast({
          title: "Template created",
          description: "Your notification template has been saved.",
        });
        setFormData({
          name: "",
          title: "",
          message: "",
          type: "info",
          target_roles: [],
        });
        setCreateDialogOpen(false);
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleUpdateField = (templateId: string, field: string, value: any) => {
    updateTemplate(
      { id: templateId, [field]: value },
      {
        onSuccess: () => {
          toast({
            title: "Template updated",
            description: "Changes have been saved.",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate(templateId, {
      onSuccess: () => {
        toast({
          title: "Template deleted",
          description: "The notification template has been removed.",
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <RoleGuard requiredPermission="manage_notifications" fallbackMessage="You don't have permission to manage notification templates.">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link to="/notifications">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <FileText className="h-8 w-8" />
                    Notification Templates
                  </h1>
                  <p className="text-muted-foreground">
                    Create reusable templates for common announcements
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" className="gap-1.5 w-full sm:w-auto" asChild>
                  <Link to="/notifications">
                    <Megaphone className="h-4 w-4" />
                    Send Notification
                  </Link>
                </Button>
                {roleData?.isAdmin && (
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 w-full sm:w-auto">
                        <Plus className="h-4 w-4" />
                        New Template
                      </Button>
                    </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create Notification Template</DialogTitle>
                    <DialogDescription>
                      Save a reusable template for common notifications. You'll select specific employees when sending.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input
                        id="template-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., System Maintenance, New Feature"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-title">Notification Title *</Label>
                      <Input
                        id="template-title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g., Scheduled Maintenance Notice"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-message">Message * (Rich Text)</Label>
                      <RichTextEditor
                        value={formData.message}
                        onChange={(message) => setFormData({ ...formData, message })}
                        placeholder="Enter the notification message..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="template-type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger id="template-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      Note: You'll select specific employees to notify when using this template to send a notification.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateTemplate} disabled={isCreating}>
                      {isCreating ? "Creating..." : "Create Template"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
                )}
              </div>
            </div>

          <div className="grid gap-4">
            {templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">
                    No templates created yet
                  </p>
                  {roleData?.isAdmin && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      Create your first template to get started
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              templates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {editingTemplate === template.id ? (
                          <Input
                            value={template.name}
                            onChange={(e) => handleUpdateField(template.id, 'name', e.target.value)}
                            className="font-semibold text-lg mb-2"
                            onBlur={() => setEditingTemplate(null)}
                            autoFocus
                          />
                        ) : (
                          <CardTitle className="flex items-center gap-2">
                            {template.name}
                            <Badge variant="outline">{template.type}</Badge>
                          </CardTitle>
                        )}
                        <CardDescription className="mt-2">
                          Created {format(new Date(template.created_at), "PPp")}
                        </CardDescription>
                      </div>
                      {roleData?.isAdmin && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingTemplate(template.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this template? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTemplate(template.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Title</Label>
                      <p className="font-medium">{template.title}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Message</Label>
                      <p className="text-sm">{template.message}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
      </div>
    </RoleGuard>
  );
}