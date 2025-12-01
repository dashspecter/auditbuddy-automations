import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocumentCategory {
  id: string;
  name: string;
  description: string | null;
  company_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export const useDocumentCategories = () => {
  return useQuery({
    queryKey: ["document_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as DocumentCategory[];
    },
  });
};

export const useCreateDocumentCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (category: Omit<DocumentCategory, "id" | "created_at" | "updated_at" | "created_by" | "company_id">) => {
      if (!user) throw new Error("Not authenticated");

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyUser) throw new Error("No company found");

      const { data, error } = await supabase
        .from("document_categories")
        .insert({
          ...category,
          company_id: companyUser.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document_categories"] });
      toast.success("Category created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create category: ${error.message}`);
    },
  });
};