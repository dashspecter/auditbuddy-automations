import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface ContractTemplate {
  id: string;
  title: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

interface ContractTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateUploaded: () => void;
}

export function ContractTemplateDialog({
  open,
  onOpenChange,
  onTemplateUploaded,
}: ContractTemplateDialogProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchTemplates();
    }
  }, [open, user]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user!.id)
        .single();

      if (!companyUser) return;

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, file_url, file_name, created_at")
        .eq("company_id", companyUser.company_id)
        .eq("document_type", "contract_template")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleDeleteTemplate = async (template: ContractTemplate) => {
    setDeletingId(template.id);
    try {
      // Extract file path from URL
      const urlParts = template.file_url.split('/documents/');
      const filePath = urlParts[urlParts.length - 1];

      // Delete from storage
      await supabase.storage.from("documents").remove([filePath]);

      // Delete from database
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", template.id);

      if (error) throw error;

      toast.success("Template deleted");
      fetchTemplates();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete template");
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".docx")) {
        toast.error("Please upload a Word document (.docx)");
        return;
      }
      setSelectedFile(file);
      if (!templateName) {
        setTemplateName(file.name.replace(".docx", ""));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName || !user) {
      toast.error("Please provide a template name and file");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `contract-templates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Get user's company ID
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyUser) throw new Error("Company not found");

      // Save template reference in documents table
      const { error: dbError } = await supabase.from("documents").insert({
        title: templateName,
        description: "Contract template for employee contracts",
        file_name: selectedFile.name,
        file_url: urlData.publicUrl,
        file_size: selectedFile.size,
        uploaded_by: user.id,
        company_id: companyUser.company_id,
        document_type: "contract_template",
      });

      if (dbError) throw dbError;

      toast.success("Contract template uploaded successfully");
      onTemplateUploaded();
      fetchTemplates();
      setTemplateName("");
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload template");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contract Templates</DialogTitle>
          <DialogDescription>
            Manage your contract templates for employee contracts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Templates Section */}
          <div>
            <Label className="text-sm font-medium">Uploaded Templates</Label>
            {loadingTemplates ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">
                No templates uploaded yet
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {template.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(template.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => window.open(template.file_url, "_blank")}
                        title="Download"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteTemplate(template)}
                        disabled={deletingId === template.id}
                        title="Delete"
                      >
                        {deletingId === template.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Upload New Template Section */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Upload New Template</Label>

            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Standard Employment Contract"
              />
            </div>

            <div className="space-y-2">
              <Label>Template File (.docx)</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="template-upload"
                />
                <label htmlFor="template-upload" className="cursor-pointer">
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-6 w-6 text-primary" />
                      <span className="text-sm">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload a Word document
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
                {uploading ? "Uploading..." : "Upload Template"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
