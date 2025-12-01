import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Upload, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { optimizeFile } from "@/lib/fileOptimization";
import { LocationSelector } from "@/components/LocationSelector";
import { format } from "date-fns";

const DocumentManagement = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [newDocument, setNewDocument] = useState({ 
    title: "", 
    description: "", 
    categoryId: "", 
    file: null as File | null,
    documentType: "knowledge",
    locationId: "",
    renewalDate: undefined as Date | undefined,
    notificationEmail: ""
  });
  const [uploading, setUploading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("knowledge");

  useEffect(() => {
    loadCategories();
    loadDocuments();
    loadLocations();
    loadUpcomingRenewals();
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
        category:document_categories(name),
        location:locations(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading documents:", error);
      toast.error("Failed to load documents");
      return;
    }

    setDocuments(data || []);
  };

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("Error loading locations:", error);
      return;
    }

    setLocations(data || []);
  };

  const loadUpcomingRenewals = async () => {
    const { data, error } = await supabase
      .from("upcoming_renewals")
      .select("*");

    if (error) {
      console.error("Error loading renewals:", error);
      return;
    }

    setUpcomingRenewals(data || []);
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name) {
      toast.error("Category name is required");
      return;
    }

    // Get user's company_id
    const { data: companyUser } = await supabase
      .from('company_users')
      .select('company_id')
      .eq('user_id', user?.id)
      .single();

    if (!companyUser) {
      toast.error("No company found for user");
      return;
    }

    const { error } = await supabase
      .from("document_categories")
      .insert({ ...newCategory, created_by: user?.id, company_id: companyUser.company_id });

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
    if (!newDocument.title || !newDocument.file) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate knowledge document specific fields
    if (newDocument.documentType === "knowledge" && !newDocument.categoryId) {
      toast.error("Category is required for knowledge documents");
      return;
    }

    // Validate permit/contract specific fields
    if (newDocument.documentType !== "knowledge") {
      if (!newDocument.locationId) {
        toast.error("Location is required for permits and contracts");
        return;
      }
      if (!newDocument.renewalDate) {
        toast.error("Renewal date is required for permits and contracts");
        return;
      }
      if (!newDocument.notificationEmail) {
        toast.error("Notification email is required for renewal reminders");
        return;
      }
    }

    setUploading(true);

    try {
      // Get user's company_id
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single();

      if (!companyUser) {
        toast.error("No company found for user");
        return;
      }

      // Optimize file before upload
      const optimized = await optimizeFile(newDocument.file);
      
      // Upload file to storage
      const fileName = `${user?.id}/${Date.now()}_${newDocument.file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, optimized.file);

      if (uploadError) throw uploadError;

      // Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(uploadData.path);

      // Save document metadata
      const { error: dbError } = await supabase
        .from("documents")
        .insert({
          category_id: newDocument.documentType === "knowledge" ? newDocument.categoryId : null,
          title: newDocument.title,
          description: newDocument.description,
          file_url: publicUrl,
          file_name: newDocument.file.name,
          file_size: newDocument.file.size,
          uploaded_by: user?.id,
          company_id: companyUser.company_id,
          document_type: newDocument.documentType,
          location_id: newDocument.documentType !== "knowledge" ? newDocument.locationId : null,
          renewal_date: newDocument.documentType !== "knowledge" ? newDocument.renewalDate?.toISOString().split('T')[0] : null,
          notification_email: newDocument.documentType !== "knowledge" ? newDocument.notificationEmail : null,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      setNewDocument({ 
        title: "", 
        description: "", 
        categoryId: "", 
        file: null,
        documentType: "knowledge",
        locationId: "",
        renewalDate: undefined,
        notificationEmail: ""
      });
      setDocumentDialogOpen(false);
      loadDocuments();
      loadUpcomingRenewals();
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
      loadUpcomingRenewals();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const knowledgeDocuments = documents.filter(d => d.document_type === "knowledge");
  const permitContractDocuments = documents.filter(d => d.document_type !== "knowledge");

  return (
    <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">Document Management</h1>
              <p className="text-muted-foreground">Upload and organize training documents, permits, and contracts</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 px-2 sm:px-3">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Category</span>
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
                  <Button size="sm" className="gap-1.5 px-2 sm:px-3">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Document Type *</Label>
                      <Select
                        value={newDocument.documentType}
                        onValueChange={(value) => setNewDocument({ ...newDocument, documentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="knowledge">Knowledge</SelectItem>
                          <SelectItem value="permit">Permit</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Title *</Label>
                      <Input
                        value={newDocument.title}
                        onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                      />
                    </div>
                    {newDocument.documentType === "knowledge" && (
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
                    )}
                    {newDocument.documentType === "knowledge" && (
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={newDocument.description}
                          onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                        />
                      </div>
                    )}
                    {newDocument.documentType !== "knowledge" && (
                      <>
                        <div>
                          <Label>Location *</Label>
                          <LocationSelector
                            value={newDocument.locationId}
                            onValueChange={(value) => setNewDocument({ ...newDocument, locationId: value })}
                          />
                        </div>
                        <div>
                          <Label>Renewal Date *</Label>
                          <div className="border rounded-md p-3">
                            <Calendar
                              mode="single"
                              selected={newDocument.renewalDate}
                              onSelect={(date) => setNewDocument({ ...newDocument, renewalDate: date })}
                              disabled={(date) => date < new Date()}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Notification Email *</Label>
                          <Input
                            type="email"
                            value={newDocument.notificationEmail}
                            onChange={(e) => setNewDocument({ ...newDocument, notificationEmail: e.target.value })}
                            placeholder="email@example.com"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Renewal reminder will be sent to this email 14 days in advance
                          </p>
                        </div>
                      </>
                    )}
                    {newDocument.documentType !== "knowledge" && (
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          value={newDocument.description}
                          onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                          placeholder="Additional notes about this permit or contract"
                        />
                      </div>
                    )}
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

          {/* Documents Section with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="knowledge">Knowledge ({knowledgeDocuments.length})</TabsTrigger>
              <TabsTrigger value="permits">Permits & Contracts ({permitContractDocuments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="knowledge" className="space-y-6">
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

              {/* Knowledge Documents */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {knowledgeDocuments.map((doc) => (
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
                {knowledgeDocuments.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No knowledge documents yet. Upload one to get started.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permits" className="space-y-6">
              {/* Upcoming Renewals Calendar View */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Upcoming Renewals</h2>
                <div className="grid gap-3">
                  {upcomingRenewals.slice(0, 5).map((renewal) => (
                    <Card key={renewal.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 shrink-0">
                          <CalendarIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{renewal.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              renewal.document_type === 'permit' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {renewal.document_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{renewal.location_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{format(new Date(renewal.renewal_date), "MMM d, yyyy")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {upcomingRenewals.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No upcoming renewals scheduled.
                    </p>
                  )}
                </div>
              </div>

              {/* All Permits & Contracts */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Permits & Contracts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {permitContractDocuments.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-8 w-8 text-primary" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{doc.title}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                doc.document_type === 'permit' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {doc.document_type}
                              </span>
                            </div>
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
                      <div className="space-y-1 text-sm">
                        {doc.location && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{doc.location.name}</span>
                          </div>
                        )}
                        {doc.renewal_date && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            <span>Renews: {format(new Date(doc.renewal_date), "MMM d, yyyy")}</span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {Math.round(doc.file_size / 1024)} KB
                        </p>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
                      )}
                    </Card>
                  ))}
                </div>
                {permitContractDocuments.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">
                    No permits or contracts yet. Upload one to get started.
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
    </div>
  );
};

export default DocumentManagement;
