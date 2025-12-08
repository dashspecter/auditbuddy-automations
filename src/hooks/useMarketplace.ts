import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  parent_id: string | null;
}

export interface MarketplaceTemplate {
  id: string;
  title: string;
  description: string | null;
  template_type: 'audit' | 'sop' | 'maintenance' | 'training';
  category_id: string | null;
  industry_id: string | null;
  author_id: string;
  author_name: string;
  author_company_name: string | null;
  content: any;
  is_published: boolean;
  is_featured: boolean;
  is_ai_generated: boolean;
  download_count: number;
  rating_sum: number;
  rating_count: number;
  average_rating: number;
  version: string;
  slug: string;
  share_token: string;
  preview_image_url: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  category?: MarketplaceCategory;
  industry?: { id: string; name: string; slug: string };
}

export interface MarketplaceRating {
  id: string;
  template_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface MarketplaceDownload {
  id: string;
  template_id: string;
  user_id: string;
  company_id: string | null;
  installed_template_id: string | null;
  created_at: string;
}

export type TemplateFilter = {
  type?: string;
  categoryId?: string;
  industryId?: string;
  search?: string;
  sort?: 'popular' | 'rating' | 'newest' | 'trending';
  featured?: boolean;
};

// Categories
export function useMarketplaceCategories() {
  return useQuery({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_categories")
        .select("*")
        .order("display_order");
      
      if (error) throw error;
      return data as MarketplaceCategory[];
    },
  });
}

// Templates with filters
export function useMarketplaceTemplates(filters: TemplateFilter = {}) {
  return useQuery({
    queryKey: ["marketplace-templates", filters],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_templates")
        .select(`
          *,
          category:marketplace_categories(*),
          industry:industries(id, name, slug)
        `)
        .eq("is_published", true);

      if (filters.type) {
        query = query.eq("template_type", filters.type);
      }
      if (filters.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters.industryId) {
        query = query.eq("industry_id", filters.industryId);
      }
      if (filters.featured) {
        query = query.eq("is_featured", true);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Sorting
      switch (filters.sort) {
        case 'popular':
          query = query.order("download_count", { ascending: false });
          break;
        case 'rating':
          query = query.order("average_rating", { ascending: false });
          break;
        case 'trending':
          // Trending = high downloads in recent time, approximated by downloads + recency
          query = query.order("download_count", { ascending: false }).order("created_at", { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MarketplaceTemplate[];
    },
  });
}

// Single template by slug
export function useMarketplaceTemplate(slug: string) {
  return useQuery({
    queryKey: ["marketplace-template", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select(`
          *,
          category:marketplace_categories(*),
          industry:industries(id, name, slug)
        `)
        .eq("slug", slug)
        .single();
      
      if (error) throw error;
      return data as MarketplaceTemplate;
    },
    enabled: !!slug,
  });
}

// Template by share token (for shared links)
export function useMarketplaceTemplateByToken(token: string) {
  return useQuery({
    queryKey: ["marketplace-template-token", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select(`
          *,
          category:marketplace_categories(*),
          industry:industries(id, name, slug)
        `)
        .eq("share_token", token)
        .single();
      
      if (error) throw error;
      return data as MarketplaceTemplate;
    },
    enabled: !!token,
  });
}

// User's own templates (for publishing)
export function useMyMarketplaceTemplates() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-marketplace-templates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select(`
          *,
          category:marketplace_categories(*),
          industry:industries(id, name, slug)
        `)
        .eq("author_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MarketplaceTemplate[];
    },
    enabled: !!user,
  });
}

// Template ratings
export function useTemplateRatings(templateId: string) {
  return useQuery({
    queryKey: ["template-ratings", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_ratings")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MarketplaceRating[];
    },
    enabled: !!templateId,
  });
}

// User's rating for a template
export function useMyTemplateRating(templateId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["my-template-rating", templateId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from("marketplace_ratings")
        .select("*")
        .eq("template_id", templateId)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as MarketplaceRating | null;
    },
    enabled: !!templateId && !!user,
  });
}

// Create template
export function useCreateMarketplaceTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (template: Partial<MarketplaceTemplate>) => {
      if (!user) throw new Error("Must be logged in");

      const slug = template.title
        ?.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-' + Date.now();

      const { data, error } = await supabase
        .from("marketplace_templates")
        .insert({
          title: template.title || "Untitled",
          description: template.description,
          template_type: template.template_type || "audit",
          category_id: template.category_id || null,
          industry_id: template.industry_id || null,
          author_id: user.id,
          author_name: template.author_name || user.email?.split("@")[0] || "Anonymous",
          author_company_name: template.author_company_name,
          content: template.content || {},
          is_published: template.is_published || false,
          slug: slug || `template-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-templates"] });
      toast.success("Template created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create template");
    },
  });
}

// Update template
export function useUpdateMarketplaceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketplaceTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-template", data.slug] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      toast.success("Template updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });
}

// Publish template
export function usePublishMarketplaceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      toast.success("Template published to marketplace!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to publish template");
    },
  });
}

// Delete template
export function useDeleteMarketplaceTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketplace_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-marketplace-templates"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      toast.success("Template deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });
}

// Rate template
export function useRateTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ templateId, rating, review }: { templateId: string; rating: number; review?: string }) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("marketplace_ratings")
        .upsert({
          template_id: templateId,
          user_id: user.id,
          rating,
          review,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'template_id,user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["template-ratings", variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ["my-template-rating", variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      toast.success("Rating submitted!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit rating");
    },
  });
}

// Install/Download template
export function useInstallMarketplaceTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ templateId, companyId }: { templateId: string; companyId?: string }) => {
      if (!user) throw new Error("Must be logged in");

      // Record the download
      const { data, error } = await supabase
        .from("marketplace_downloads")
        .insert({
          template_id: templateId,
          user_id: user.id,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-templates"] });
      toast.success("Template installed successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to install template");
    },
  });
}

// Featured templates
export function useFeaturedTemplates() {
  return useMarketplaceTemplates({ featured: true, sort: 'popular' });
}

// Popular templates
export function usePopularTemplates(limit = 10) {
  return useQuery({
    queryKey: ["popular-templates", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select(`
          *,
          category:marketplace_categories(*),
          industry:industries(id, name, slug)
        `)
        .eq("is_published", true)
        .order("download_count", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as MarketplaceTemplate[];
    },
  });
}

// New templates this week
export function useNewThisWeekTemplates(limit = 10) {
  return useQuery({
    queryKey: ["new-this-week-templates", limit],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from("marketplace_templates")
        .select(`
          *,
          category:marketplace_categories(*),
          industry:industries(id, name, slug)
        `)
        .eq("is_published", true)
        .gte("published_at", oneWeekAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as MarketplaceTemplate[];
    },
  });
}
