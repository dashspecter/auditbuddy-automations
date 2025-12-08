import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, ArrowLeft, Edit, Trash2, Eye, Share2, 
  MoreVertical, Star, Download, CheckCircle, Clock,
  BookOpen, Package, Wrench, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import { format } from "date-fns";
import { 
  useMyMarketplaceTemplates, 
  usePublishMarketplaceTemplate,
  useDeleteMarketplaceTemplate,
  MarketplaceTemplate 
} from "@/hooks/useMarketplace";

const templateTypeIcons = {
  audit: BookOpen,
  sop: Package,
  maintenance: Wrench,
  training: GraduationCap,
};

const templateTypeLabels = {
  audit: "Audit",
  sop: "SOP",
  maintenance: "Maintenance",
  training: "Training",
};

export default function MyMarketplaceTemplates() {
  const navigate = useNavigate();
  const { data: templates, isLoading } = useMyMarketplaceTemplates();
  const publishTemplate = usePublishMarketplaceTemplate();
  const deleteTemplate = useDeleteMarketplaceTemplate();
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<MarketplaceTemplate | null>(null);

  const handlePublish = async (template: MarketplaceTemplate) => {
    try {
      await publishTemplate.mutateAsync(template.id);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleShare = async (template: MarketplaceTemplate) => {
    const shareUrl = `${window.location.origin}/marketplace/share/${template.share_token}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Share link copied to clipboard!");
  };

  const publishedTemplates = templates?.filter(t => t.is_published) || [];
  const draftTemplates = templates?.filter(t => !t.is_published) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/marketplace")} className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
            <h1 className="text-3xl font-bold">My Templates</h1>
            <p className="text-muted-foreground">
              Manage your published and draft templates
            </p>
          </div>
          <Button onClick={() => navigate("/marketplace/publish")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Published Templates */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-xl font-semibold">Published ({publishedTemplates.length})</h2>
          </div>
          
          {publishedTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedTemplates.map((template) => {
                const Icon = templateTypeIcons[template.template_type] || Package;
                
                return (
                  <Card key={template.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                            <Icon className="h-4 w-4" />
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {templateTypeLabels[template.template_type]}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/marketplace/template/${template.slug}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleShare(template)}>
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setTemplateToDelete(template);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <h3 className="font-semibold line-clamp-1">{template.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.description || "No description"}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {template.average_rating?.toFixed(1) || "0.0"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {template.download_count}
                        </span>
                      </div>
                      <span>
                        Published {format(new Date(template.published_at || template.created_at), "MMM d, yyyy")}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-muted-foreground">No published templates yet</p>
            </Card>
          )}
        </div>

        {/* Draft Templates */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Drafts ({draftTemplates.length})</h2>
          </div>
          
          {draftTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftTemplates.map((template) => {
                const Icon = templateTypeIcons[template.template_type] || Package;
                
                return (
                  <Card key={template.id} className="border-dashed">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-4 w-4" />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Draft
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePublish(template)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                setTemplateToDelete(template);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3">
                      <h3 className="font-semibold line-clamp-1">
                        {template.title || "Untitled Template"}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {template.description || "No description"}
                      </p>
                    </CardContent>
                    <CardFooter className="pt-3 border-t">
                      <span className="text-xs text-muted-foreground">
                        Created {format(new Date(template.created_at), "MMM d, yyyy")}
                      </span>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-6 text-center border-dashed">
              <p className="text-muted-foreground">No draft templates</p>
            </Card>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.title}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
