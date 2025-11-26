import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const DocumentManagement = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newDocument, setNewDocument] = useState({ title: "", description: "", categoryId: "", file: null as File | null });
  const [uploading, setUploading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadDocuments();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("document_categories")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
      return;
    }

    setCategories(data || []);
  };

  const loadDocuments = async () => {
    const { data, error } = await supabase
      .from("documents")
      .select(`
        *,
        category:document_categories(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
      return;
    }

    setDocuments(data || []);
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast.error("Category name is required");
      return;
    }

    const { error } = await supabase
      .from("document_categories")
      .insert({ ...newCategory, created_by: user?.id });

    if (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
      return;
    }

    toast.success("Category created successfully");
    setNewCategory({ name: "", description: "" });
    setCategoryDialogOpen(false);
    loadCategories();
  };

  const handleUploadDocument = async () => {
    if (!newDocument.title || !newDocument.categoryId || !newDocument.file) {
      toast.error("Please fill all required fields");
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileName = `${user?.id}/${Date.now()}_${newDocument.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, newDocument.file);

      if (uploadError) throw uploadError;

      // Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(uploadData.path);

      // Save document metadata
      const { error: dbError } = await supabase
        .from("documents")
        .insert({
          category_id: newDocument.categoryId,
          title: newDocument.title,
          description: newDocument.description,
          file_url: publicUrl,
          file_name: newDocument.file.name,
          file_size: newDocument.file.size,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setNewDocument({ title: "", description: "", categoryId: "", file: null });
      setDocumentDialogOpen(false);
      loadDocuments();
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/documents/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("documents").remove([filePath]);
      }

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Document deleted successfully");
      loadDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pt-safe">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Document Management</h1>
              <p className="text-muted-foreground">Upload and organize training documents</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                        placeholder="e.g., Safety Procedures"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newCategory.description}
                        onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <Button onClick={handleCreateCategory} className="w-full">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={documentDialogOpen} onOpenChange={setDocumentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={newDocument.title}
                        onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Category *</Label>
                      <Select
                        value={newDocument.categoryId}
                        onValueChange={(value) => setNewDocument({ ...newDocument, categoryId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newDocument.description}
                        onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>File *</Label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx"
                        onChange={(e) => setNewDocument({ ...newDocument, file: e.target.files?.[0] || null })}
                      />
                    </div>
                    <Button onClick={handleUploadDocument} disabled={uploading} className="w-full">
                      {uploading ? "Uploading..." : "Upload"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Categories Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map((cat) => (
                <Card key={cat.id} className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-sm text-muted-foreground">{cat.description}</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
            {categories.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No categories yet. Create one to get started.
              </p>
            )}
          </div>

          {/* Documents Section */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Documents ({documents.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-8 w-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">{doc.category?.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {Math.round(doc.file_size / 1024)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  {doc.description && (
                    <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
                  )}
                </Card>
              ))}
            </div>
            {documents.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No documents yet. Upload one to get started.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocumentManagement;
