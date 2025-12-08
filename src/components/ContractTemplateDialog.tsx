import { useState } from "react";
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
import { Upload, FileText, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
      onOpenChange(false);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Contract Template</DialogTitle>
          <DialogDescription>
            Upload a Word document (.docx) with placeholders for employee data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-primary" />
              <div className="text-sm">
                <p className="font-medium mb-1">Available Placeholders:</p>
                <div className="grid grid-cols-2 gap-1 text-muted-foreground text-xs">
                  <span>{"{{full_name}}"}</span>
                  <span>{"{{email}}"}</span>
                  <span>{"{{phone}}"}</span>
                  <span>{"{{role}}"}</span>
                  <span>{"{{location}}"}</span>
                  <span>{"{{hire_date}}"}</span>
                  <span>{"{{contract_type}}"}</span>
                  <span>{"{{base_salary}}"}</span>
                  <span>{"{{hourly_rate}}"}</span>
                  <span>{"{{start_date}}"}</span>
                  <span>{"{{working_days}}"}</span>
                  <span>{"{{working_hours}}"}</span>
                  <span>{"{{current_date}}"}</span>
                  <span>{"{{vacation_days}}"}</span>
                </div>
              </div>
            </div>
          </div>

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
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
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
                    <FileText className="h-8 w-8 text-primary" />
                    <span className="text-sm">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload a Word document
                    </p>
                  </div>
                )}
              </label>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
              {uploading ? "Uploading..." : "Upload Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
