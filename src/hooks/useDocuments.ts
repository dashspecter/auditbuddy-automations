import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Document {
  id: string;
  title: string;
  description: string | null;
  file_name: string;
  file_url: string;
  file_size: number | null;
  document_type: string | null;
  category_id: string | null;
  location_id: string | null;
  module_scope: string | null;
  required_reading: boolean | null;
  renewal_date: string | null;
  notification_email: string | null;
  uploaded_by: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
  document_categories?: {
    name: string;
  };
  locations?: {
    name: string;
  };
}

export const useDocuments = (filters?: {
  categoryId?: string;
  locationId?: string;
  moduleScope?: string;
  documentType?: string;
}) => {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select(`
          *,
          document_categories(name),
          locations(name)
        `)
        .order("created_at", { ascending: false });

      if (filters?.categoryId) {
        query = query.eq("category_id", filters.categoryId);
      }
      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters?.moduleScope) {
        query = query.eq("module_scope", filters.moduleScope);
      }
      if (filters?.documentType) {
        query = query.eq("document_type", filters.documentType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });
};

export const useDocument = (id: string | undefined) => {
  return useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          document_categories(name),
          locations(name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Document;
    },
    enabled: !!id,
  });
};

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      file,
      metadata,
    }: {
      file: File;
      metadata: Omit<Document, "id" | "file_url" | "file_name" | "file_size" | "uploaded_by" | "created_at" | "updated_at">;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // Save metadata to database
      const { data, error } = await supabase
        .from("documents")
        .insert({
          ...metadata,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
};