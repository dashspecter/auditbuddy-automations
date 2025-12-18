import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Upload, Calendar as CalendarIcon, MapPin, AlertTriangle, Clock, BookOpen, FileCheck, ScrollText, ExternalLink, FolderOpen, ArrowLeft, Folder, MoreVertical, Pencil, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { optimizeFile } from "@/lib/fileOptimization";
import { LocationSelector } from "@/components/LocationSelector";
import { format, differenceInDays } from "date-fns";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { useEmployeeRoles } from "@/hooks/useEmployeeRoles";

const DocumentManagement = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: employeeRoles = [] } = useEmployeeRoles();
  const [categories, setCategories] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", visibleToRoles: [] as string[] });
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
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);

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
      .insert({ 
        name: newCategory.name, 
        description: newCategory.description, 
        visible_to_roles: newCategory.visibleToRoles,
        created_by: user?.id, 
        company_id: companyUser.company_id 
      });

    if (error) {
      console.error("Error creating category:", error);
      toast.error("Failed to create category");
      return;
    }

    toast.success("Category created successfully");
    setNewCategory({ name: "", description: "", visibleToRoles: [] });
    setCategoryDialogOpen(false);
    loadCategories();
  };

  const handleEditCategory = async () => {
    if (!editingCategory?.name) {
      toast.error("Category name is required");
      return;
    }

    const { error } = await supabase
      .from("document_categories")
      .update({ 
        name: editingCategory.name, 
        description: editingCategory.description,
        visible_to_roles: editingCategory.visible_to_roles || []
      })
      .eq("id", editingCategory.id);

    if (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
      return;
    }

    toast.success("Category updated successfully");
    setEditingCategory(null);
    setEditCategoryDialogOpen(false);
    loadCategories();
    if (selectedCategory?.id === editingCategory.id) {
      setSelectedCategory({ ...selectedCategory, name: editingCategory.name, description: editingCategory.description });
    }
  };

  const handleDeleteCategory = async (category: any) => {
    const docCount = documents.filter(d => d.category_id === category.id).length;
    
    if (docCount > 0) {
      toast.error(`Cannot delete category with ${docCount} document(s). Move or delete documents first.`);
      return;
    }

    if (!confirm(`Are you sure you want to delete the category "${category.name}"?`)) return;

    const { error } = await supabase
      .from("document_categories")
      .delete()
      .eq("id", category.id);

    if (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
      return;
    }

    toast.success("Category deleted successfully");
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
  const contractDocuments = documents.filter(d => d.document_type === "contract");
  const permitDocuments = documents.filter(d => d.document_type === "permit");

  const getRenewalStatus = (renewalDate: string) => {
    const daysUntil = differenceInDays(new Date(renewalDate), new Date());
    if (daysUntil < 0) return { label: "Expired", variant: "destructive" as const, urgent: true };
    if (daysUntil <= 14) return { label: `${daysUntil}d left`, variant: "destructive" as const, urgent: true };
    if (daysUntil <= 30) return { label: `${daysUntil}d left`, variant: "outline" as const, urgent: false };
    return { label: `${daysUntil}d left`, variant: "secondary" as const, urgent: false };
  };

  const renderDocumentCard = (doc: any) => {
    const renewalStatus = doc.renewal_date ? getRenewalStatus(doc.renewal_date) : null;
    
    return (
      <Card key={doc.id} className={`p-4 ${renewalStatus?.urgent ? 'border-destructive/50' : ''}`}>
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            {doc.document_type === 'contract' ? (
              <ScrollText className="h-8 w-8 text-green-600" />
            ) : (
              <FileCheck className="h-8 w-8 text-blue-600" />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{doc.title}</h3>
              {doc.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{doc.location.name}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(doc.file_url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        {doc.renewal_date && renewalStatus && (
          <div className="flex items-center gap-2 mt-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {format(new Date(doc.renewal_date), "MMM d, yyyy")}
            </span>
            <Badge variant={renewalStatus.variant} className="ml-auto">
              {renewalStatus.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
              {renewalStatus.label}
            </Badge>
          </div>
        )}
        {doc.description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{doc.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {Math.round((doc.file_size || 0) / 1024)} KB
        </p>
      </Card>
    );
  };

  return (
    <ModuleGate module="documents">
    <div className="space-y-6">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{t('documentManagement.title')}</h1>
              <p className="text-muted-foreground">{t('documentManagement.subtitle')}</p>
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
                    <div>
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Visible to Roles
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Leave empty to make visible to all employees
                      </p>
                      <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                        {employeeRoles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`new-role-${role.id}`}
                              checked={newCategory.visibleToRoles.includes(role.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewCategory({ 
                                    ...newCategory, 
                                    visibleToRoles: [...newCategory.visibleToRoles, role.name] 
                                  });
                                } else {
                                  setNewCategory({ 
                                    ...newCategory, 
                                    visibleToRoles: newCategory.visibleToRoles.filter(r => r !== role.name) 
                                  });
                                }
                              }}
                            />
                            <label htmlFor={`new-role-${role.id}`} className="text-sm cursor-pointer">
                              {role.name}
                            </label>
                          </div>
                        ))}
                        {employeeRoles.length === 0 && (
                          <p className="text-sm text-muted-foreground">No roles defined yet</p>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleCreateCategory} className="w-full">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit Category Dialog */}
              <Dialog open={editCategoryDialogOpen} onOpenChange={setEditCategoryDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Category</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={editingCategory?.name || ""}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        placeholder="Category name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={editingCategory?.description || ""}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div>
                      <Label className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Visible to Roles
                      </Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Leave empty to make visible to all employees
                      </p>
                      <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                        {employeeRoles.map((role) => (
                          <div key={role.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-role-${role.id}`}
                              checked={(editingCategory?.visible_to_roles || []).includes(role.name)}
                              onCheckedChange={(checked) => {
                                const currentRoles = editingCategory?.visible_to_roles || [];
                                if (checked) {
                                  setEditingCategory({ 
                                    ...editingCategory, 
                                    visible_to_roles: [...currentRoles, role.name] 
                                  });
                                } else {
                                  setEditingCategory({ 
                                    ...editingCategory, 
                                    visible_to_roles: currentRoles.filter((r: string) => r !== role.name) 
                                  });
                                }
                              }}
                            />
                            <label htmlFor={`edit-role-${role.id}`} className="text-sm cursor-pointer">
                              {role.name}
                            </label>
                          </div>
                        ))}
                        {employeeRoles.length === 0 && (
                          <p className="text-sm text-muted-foreground">No roles defined yet</p>
                        )}
                      </div>
                    </div>
                    <Button onClick={handleEditCategory} className="w-full">Save Changes</Button>
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
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="knowledge" className="gap-1.5">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Knowledge</span>
                <span className="text-xs">({knowledgeDocuments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="contracts" className="gap-1.5">
                <ScrollText className="h-4 w-4" />
                <span className="hidden sm:inline">Contracts</span>
                <span className="text-xs">({contractDocuments.length})</span>
              </TabsTrigger>
              <TabsTrigger value="permits" className="gap-1.5">
                <FileCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Permits</span>
                <span className="text-xs">({permitDocuments.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="knowledge" className="space-y-6">
              {selectedCategory ? (
                /* Documents inside selected category */
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Categories
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <FolderOpen className="h-6 w-6 text-primary" />
                    <div>
                      <h2 className="text-xl font-semibold">{selectedCategory.name}</h2>
                      {selectedCategory.description && (
                        <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {knowledgeDocuments
                      .filter(doc => doc.category_id === selectedCategory.id)
                      .map((doc) => (
                        <Card key={doc.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <FileText className="h-8 w-8 text-primary" />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate">{doc.title}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {Math.round(doc.file_size / 1024)} KB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(doc.file_url, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          {doc.description && (
                            <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
                          )}
                        </Card>
                      ))}
                  </div>
                  {knowledgeDocuments.filter(doc => doc.category_id === selectedCategory.id).length === 0 && (
                    <EmptyState
                      icon={FileText}
                      title="No Documents in this Category"
                      description="This category is empty. Upload a document to get started."
                      action={{
                        label: "Upload Document",
                        onClick: () => {
                          setNewDocument({ ...newDocument, categoryId: selectedCategory.id });
                          setDocumentDialogOpen(true);
                        }
                      }}
                    />
                  )}
                </div>
              ) : (
                /* Categories grid view */
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {categories.map((cat) => {
                      const docCount = knowledgeDocuments.filter(d => d.category_id === cat.id).length;
                      return (
                        <Card 
                          key={cat.id} 
                          className="p-4 hover:border-primary transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <Folder 
                              className="h-8 w-8 text-primary cursor-pointer" 
                              onClick={() => setSelectedCategory(cat)}
                            />
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => setSelectedCategory(cat)}
                            >
                              <h3 className="font-semibold">{cat.name}</h3>
                              {cat.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">{cat.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <p className="text-xs text-muted-foreground">
                                  {docCount} {docCount === 1 ? 'document' : 'documents'}
                                </p>
                                {cat.visible_to_roles && cat.visible_to_roles.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    <Users className="h-3 w-3 mr-1" />
                                    {cat.visible_to_roles.length} role{cat.visible_to_roles.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingCategory({ ...cat });
                                  setEditCategoryDialogOpen(true);
                                }}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCategory(cat)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                  {categories.length === 0 && (
                    <EmptyState
                      icon={FileText}
                      title="No Categories"
                      description="No categories yet. Create one to organize your documents."
                      action={{
                        label: "Create Category",
                        onClick: () => setCategoryDialogOpen(true)
                      }}
                    />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="contracts" className="space-y-6">
              {/* Upcoming Contract Renewals */}
              {upcomingRenewals.filter(r => r.document_type === 'contract').length > 0 && (
                <Card className="p-4 border-yellow-200 bg-yellow-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-yellow-800">Upcoming Renewals</h3>
                  </div>
                  <div className="space-y-2">
                    {upcomingRenewals.filter(r => r.document_type === 'contract').slice(0, 3).map((renewal) => {
                      const status = getRenewalStatus(renewal.renewal_date);
                      return (
                        <div key={renewal.id} className="flex items-center justify-between p-2 bg-background rounded">
                          <div className="flex items-center gap-2">
                            <ScrollText className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{renewal.title}</span>
                            <span className="text-sm text-muted-foreground">• {renewal.location_name}</span>
                          </div>
                          <Badge variant={status.variant}>
                            {status.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {format(new Date(renewal.renewal_date), "MMM d")} ({status.label})
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* All Contracts */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Contracts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contractDocuments.map(renderDocumentCard)}
                </div>
                {contractDocuments.length === 0 && (
                  <EmptyState
                    icon={ScrollText}
                    title="No Contracts"
                    description="No contracts uploaded yet. Add contracts with renewal dates to track them."
                    action={{
                      label: "Upload Contract",
                      onClick: () => {
                        setNewDocument({ ...newDocument, documentType: "contract" });
                        setDocumentDialogOpen(true);
                      }
                    }}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="permits" className="space-y-6">
              {/* Upcoming Permit Renewals */}
              {upcomingRenewals.filter(r => r.document_type === 'permit').length > 0 && (
                <Card className="p-4 border-blue-200 bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">Upcoming Renewals</h3>
                  </div>
                  <div className="space-y-2">
                    {upcomingRenewals.filter(r => r.document_type === 'permit').slice(0, 3).map((renewal) => {
                      const status = getRenewalStatus(renewal.renewal_date);
                      return (
                        <div key={renewal.id} className="flex items-center justify-between p-2 bg-background rounded">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{renewal.title}</span>
                            <span className="text-sm text-muted-foreground">• {renewal.location_name}</span>
                          </div>
                          <Badge variant={status.variant}>
                            {status.urgent && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {format(new Date(renewal.renewal_date), "MMM d")} ({status.label})
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* All Permits */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">All Permits</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {permitDocuments.map(renderDocumentCard)}
                </div>
                {permitDocuments.length === 0 && (
                  <EmptyState
                    icon={FileCheck}
                    title="No Permits"
                    description="No permits uploaded yet. Add permits with renewal dates to get reminders 2 weeks before expiry."
                    action={{
                      label: "Upload Permit",
                      onClick: () => {
                        setNewDocument({ ...newDocument, documentType: "permit" });
                        setDocumentDialogOpen(true);
                      }
                    }}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
    </div>
    </ModuleGate>
  );
};

export default DocumentManagement;
