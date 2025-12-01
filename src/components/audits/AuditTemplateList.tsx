import { useState } from "react";
import { useAuditTemplates, useDeleteAuditTemplate } from "@/hooks/useAuditTemplates";
import { useLocations } from "@/hooks/useLocations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Copy, Globe } from "lucide-react";
import { Link } from "react-router-dom";
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

export const AuditTemplateList = () => {
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: templates, isLoading } = useAuditTemplates();
  const { data: locations } = useLocations();
  const deleteTemplate = useDeleteAuditTemplate();

  const filteredTemplates = templates?.filter((template) => {
    if (locationFilter === "all") return true;
    if (locationFilter === "global") return template.is_global;
    return template.location_id === locationFilter;
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteTemplate.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Templates</h2>
          <p className="text-muted-foreground">Create and manage audit templates</p>
        </div>
        <Link to="/audits/templates/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </Link>
      </div>

      <div className="flex gap-4">
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Templates</SelectItem>
            <SelectItem value="global">Global Templates</SelectItem>
            {locations?.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>
                {loc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading templates...</div>
      ) : filteredTemplates && filteredTemplates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {template.description || "No description"}
                    </CardDescription>
                  </div>
                  {template.is_global && (
                    <Globe className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{template.template_type}</Badge>
                  {!template.is_global && template.locations && (
                    <Badge variant="secondary">{template.locations.name}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Link to={`/audits/templates/${template.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  </Link>
                  <Link to={`/audits/schedule?template=${template.id}`} className="flex-1">
                    <Button variant="default" size="sm" className="w-full gap-2">
                      <Copy className="h-4 w-4" />
                      Use
                    </Button>
                  </Link>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteId(template.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No templates found.</p>
            <p className="text-sm mt-2">Create your first audit template to get started.</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
