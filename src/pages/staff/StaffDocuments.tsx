import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { FileText, Folder, FolderOpen, ArrowLeft, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

interface Category {
  id: string;
  name: string;
  description: string | null;
  visible_to_roles: string[] | null;
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  category_id: string | null;
}

const StaffDocuments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [employeeRole, setEmployeeRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadEmployeeAndData();
    }
  }, [user]);

  const loadEmployeeAndData = async () => {
    try {
      // Get employee's role
      const { data: empData } = await supabase
        .from("employees")
        .select("role, company_id")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (empData) {
        setEmployeeRole(empData.role);
        await loadCategories(empData.company_id, empData.role);
        await loadDocuments(empData.company_id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async (companyId: string, role: string) => {
    const { data, error } = await supabase
      .from("document_categories")
      .select("id, name, description, visible_to_roles")
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    // Filter categories based on role visibility
    const filteredCategories = (data || []).filter((cat: Category) => {
      // Empty array or null means visible to all
      if (!cat.visible_to_roles || cat.visible_to_roles.length === 0) {
        return true;
      }
      // Check if employee's role is in the visible_to_roles array
      return cat.visible_to_roles.includes(role);
    });

    setCategories(filteredCategories);
  };

  const loadDocuments = async (companyId: string) => {
    const { data, error } = await supabase
      .from("documents")
      .select("id, title, description, file_url, file_name, file_size, category_id")
      .eq("company_id", companyId)
      .eq("document_type", "knowledge")
      .order("title");

    if (error) {
      console.error("Error loading documents:", error);
      return;
    }

    setDocuments(data || []);
  };

  const getCategoryDocuments = (categoryId: string) => {
    return documents.filter(doc => doc.category_id === categoryId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-6">
        <div className="px-4 pt-4">
          <h1 className="text-2xl font-bold">{t("staffDocuments.title")}</h1>
          <p className="text-sm opacity-90">{t("staffDocuments.subtitle")}</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {selectedCategory ? (
          /* Documents inside selected category */
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("staffDocuments.backToCategories")}
            </Button>
            
            <div className="flex items-center gap-3">
              <FolderOpen className="h-6 w-6 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">{selectedCategory.name}</h2>
                {selectedCategory.description && (
                  <p className="text-sm text-muted-foreground">{selectedCategory.description}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {getCategoryDocuments(selectedCategory.id).map((doc) => (
                <Card key={doc.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{doc.title}</h3>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {doc.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {Math.round((doc.file_size || 0) / 1024)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.file_url, '_blank')}
                      className="gap-2 flex-shrink-0"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {t("common.view")}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {getCategoryDocuments(selectedCategory.id).length === 0 && (
              <EmptyState
                icon={FileText}
                title={t("staffDocuments.noDocuments")}
                description={t("staffDocuments.noDocumentsInCategory")}
              />
            )}
          </div>
        ) : (
          /* Categories list */
          <div className="space-y-4">
            {categories.length === 0 ? (
              <EmptyState
                icon={Folder}
                title={t("staffDocuments.noDocumentsAvailable")}
                description={t("staffDocuments.noDocumentsForRole")}
              />
            ) : (
              <div className="space-y-3">
                {categories.map((cat) => {
                  const docCount = getCategoryDocuments(cat.id).length;
                  return (
                    <Card 
                      key={cat.id} 
                      className="p-4 cursor-pointer hover:border-primary transition-colors active:scale-[0.98]"
                      onClick={() => setSelectedCategory(cat)}
                    >
                      <div className="flex items-center gap-3">
                        <Folder className="h-10 w-10 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{cat.name}</h3>
                          {cat.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {cat.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {docCount} {docCount === 1 ? t("staffDocuments.document") : t("staffDocuments.documents")}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffDocuments;
