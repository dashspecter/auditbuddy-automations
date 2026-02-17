import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, QrCode, Grid3X3, List, MoreVertical, Pencil, Trash2, Settings2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";

const TYPES = [
  { value: "monthly_grid", label: "Monthly Grid", icon: Grid3X3 },
  { value: "event_log", label: "Event Log", icon: List },
];

export default function QrFormTemplates() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newType, setNewType] = useState<"monthly_grid" | "event_log">("monthly_grid");
  const [newDescription, setNewDescription] = useState("");

  // Category management state
  const [catMgmtOpen, setCatMgmtOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catName, setCatName] = useState("");

  // Fetch categories from DB
  const { data: categories = [] } = useQuery({
    queryKey: ["form-categories", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("form_categories")
        .select("*")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Set default category when categories load
  const defaultCategory = categories[0]?.slug || "";

  const { data: templates, isLoading } = useQuery({
    queryKey: ["form-templates", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("form_templates")
        .select(`
          *,
          form_template_versions(id, version, is_active, created_at),
          location_form_templates(id)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Category CRUD mutations
  const addCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user || !company?.id) throw new Error("Not authenticated");
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const maxOrder = categories.length > 0 ? Math.max(...categories.map((c: any) => c.display_order)) + 1 : 0;
      const { error } = await supabase.from("form_categories").insert({
        company_id: company.id,
        name,
        slug,
        display_order: maxOrder,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-categories"] });
      setCatName("");
      toast.success("Category added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const { error } = await supabase.from("form_categories").update({ name, slug }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-categories"] });
      setEditingCat(null);
      setCatName("");
      toast.success("Category updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("form_categories").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-categories"] });
      toast.success("Category removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user || !company?.id) throw new Error("Not authenticated");

      const { data: template, error: tErr } = await supabase
        .from("form_templates")
        .insert({
          company_id: company.id,
          name: newName,
          category: newCategory || defaultCategory,
          type: newType,
          created_by: user.id,
        })
        .select()
        .single();
      if (tErr) throw tErr;

      const defaultSchema = newType === "monthly_grid"
        ? {
            sections: [],
            gridConfig: {
              checkpoints: [
                { time: "10:30", label: "10:30" },
                { time: "14:30", label: "14:30" },
                { time: "21:30", label: "21:30" },
              ],
              cellFields: [
                { key: "value", type: "number", label: "Value", unit: "°C" },
                { key: "initials", type: "text", label: "Initials" },
              ],
            },
            recommendedRange: { min: 0, max: 4, unit: "°C" },
          }
        : {
            sections: [],
            columns: [],
            maxRows: 12,
          };

      const { error: vErr } = await supabase
        .from("form_template_versions")
        .insert({
          template_id: template.id,
          version: 1,
          schema: defaultSchema,
          notes: newDescription || "Initial version",
          created_by: user.id,
        });
      if (vErr) throw vErr;

      return template;
    },
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      toast.success("Template created successfully");
      navigate(`/admin/qr-forms/templates/${template.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("form_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = templates?.filter((t: any) => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || t.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const getCategoryLabel = (slug: string) => {
    const cat = categories.find((c: any) => c.slug === slug);
    return cat?.name || slug;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            QR Form Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage HACCP / Quality Record form templates
          </p>
        </div>
        <div className="flex gap-2">
          {/* Manage Categories Button */}
          <Dialog open={catMgmtOpen} onOpenChange={setCatMgmtOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Manage Categories">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Categories</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                {/* Existing categories */}
                <div className="space-y-2">
                  {categories.map((cat: any) => (
                    <div key={cat.id} className="flex items-center gap-2">
                      {editingCat?.id === cat.id ? (
                        <>
                          <Input
                            value={catName}
                            onChange={(e) => setCatName(e.target.value)}
                            className="flex-1 h-9"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && catName.trim()) {
                                updateCategoryMutation.mutate({ id: cat.id, name: catName.trim() });
                              }
                              if (e.key === "Escape") {
                                setEditingCat(null);
                                setCatName("");
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (catName.trim()) updateCategoryMutation.mutate({ id: cat.id, name: catName.trim() });
                            }}
                            disabled={!catName.trim() || updateCategoryMutation.isPending}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingCat(null); setCatName(""); }}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm">{cat.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => { setEditingCat(cat); setCatName(cat.name); }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Remove category "${cat.name}"?`)) {
                                deleteCategoryMutation.mutate(cat.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
                  )}
                </div>

                {/* Add new category */}
                {!editingCat && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Input
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 h-9"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && catName.trim()) {
                          addCategoryMutation.mutate(catName.trim());
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (catName.trim()) addCategoryMutation.mutate(catName.trim());
                      }}
                      disabled={!catName.trim() || addCategoryMutation.isPending}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Template */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Form Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Template Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Fridge Temperature Log"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newCategory || defaultCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.slug} value={c.slug}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Form Type</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {TYPES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setNewType(t.value as any)}
                        className={`p-4 border rounded-lg text-left transition-colors ${
                          newType === t.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <t.icon className="h-5 w-5 mb-2" />
                        <div className="font-medium text-sm">{t.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {t.value === "monthly_grid"
                            ? "Days 1-31 with timed checkpoints"
                            : "Row-based entries (e.g. thawing, oil)"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Notes about this template..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c: any) => (
              <SelectItem key={c.slug} value={c.slug}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No templates yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Create your first form template to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template: any) => {
            const latestVersion = template.form_template_versions
              ?.sort((a: any, b: any) => b.version - a.version)[0];
            const assignmentCount = template.location_form_templates?.length || 0;

            return (
              <Card
                key={template.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/admin/qr-forms/templates/${template.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {format(new Date(template.created_at), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin/qr-forms/templates/${template.id}`); }}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Delete this template and all its versions?")) {
                              deleteMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="capitalize">
                      {getCategoryLabel(template.category)}
                    </Badge>
                    <Badge variant="secondary">
                      {template.type === "monthly_grid" ? "Monthly Grid" : "Event Log"}
                    </Badge>
                    {!template.is_active && (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                    <span>v{latestVersion?.version || 1}</span>
                    <span>{assignmentCount} location{assignmentCount !== 1 ? "s" : ""}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
