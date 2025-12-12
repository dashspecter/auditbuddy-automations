import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MysteryShopperTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  default_location_ids: string[];
  voucher_value: number;
  voucher_currency: string;
  voucher_expiry_days: number;
  voucher_terms_text: string | null;
  brand_logo_url: string | null;
  is_active: boolean;
  public_token: string;
  require_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface MysteryShopperQuestion {
  id: string;
  template_id: string;
  order_index: number;
  question_text: string;
  question_type: 'multiple_choice' | 'rating' | 'text' | 'photo';
  options: string[];
  rating_scale: { min: number; max: number; labels?: string[] };
  is_required: boolean;
  created_at: string;
  updated_at: string;
}

export const useMysteryShopperTemplates = () => {
  return useQuery({
    queryKey: ["mystery-shopper-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mystery_shopper_templates")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as MysteryShopperTemplate[];
    },
  });
};

export const useMysteryShopperTemplate = (templateId?: string) => {
  return useQuery({
    queryKey: ["mystery-shopper-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from("mystery_shopper_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      
      if (error) throw error;
      return data as MysteryShopperTemplate;
    },
    enabled: !!templateId,
  });
};

export const useMysteryShopperTemplateByToken = (token?: string) => {
  return useQuery({
    queryKey: ["mystery-shopper-template-token", token],
    queryFn: async () => {
      if (!token) return null;
      
      const { data, error } = await supabase
        .from("mystery_shopper_templates")
        .select("*")
        .eq("public_token", token)
        .eq("is_active", true)
        .single();
      
      if (error) throw error;
      return data as MysteryShopperTemplate;
    },
    enabled: !!token,
  });
};

export const useMysteryShopperQuestions = (templateId?: string) => {
  return useQuery({
    queryKey: ["mystery-shopper-questions", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await supabase
        .from("mystery_shopper_questions")
        .select("*")
        .eq("template_id", templateId)
        .order("order_index", { ascending: true });
      
      if (error) throw error;
      return data as MysteryShopperQuestion[];
    },
    enabled: !!templateId,
  });
};

export const useCreateMysteryShopperTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (template: Omit<MysteryShopperTemplate, "id" | "created_at" | "updated_at" | "public_token">) => {
      const { data, error } = await supabase
        .from("mystery_shopper_templates")
        .insert(template)
        .select()
        .single();
      
      if (error) throw error;
      return data as MysteryShopperTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-templates"] });
      toast.success("Mystery Shopper template created");
    },
    onError: (error) => {
      toast.error("Failed to create template: " + error.message);
    },
  });
};

export const useUpdateMysteryShopperTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MysteryShopperTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("mystery_shopper_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MysteryShopperTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-templates"] });
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-template"] });
      toast.success("Template updated");
    },
    onError: (error) => {
      toast.error("Failed to update template: " + error.message);
    },
  });
};

export const useDeleteMysteryShopperTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mystery_shopper_templates")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete template: " + error.message);
    },
  });
};

export const useCreateMysteryShopperQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (question: Omit<MysteryShopperQuestion, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("mystery_shopper_questions")
        .insert(question)
        .select()
        .single();
      
      if (error) throw error;
      return data as MysteryShopperQuestion;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-questions", variables.template_id] });
      toast.success("Question added");
    },
    onError: (error) => {
      toast.error("Failed to add question: " + error.message);
    },
  });
};

export const useUpdateMysteryShopperQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MysteryShopperQuestion> & { id: string }) => {
      const { data, error } = await supabase
        .from("mystery_shopper_questions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MysteryShopperQuestion;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-questions", data.template_id] });
      toast.success("Question updated");
    },
    onError: (error) => {
      toast.error("Failed to update question: " + error.message);
    },
  });
};

export const useDeleteMysteryShopperQuestion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, templateId }: { id: string; templateId: string }) => {
      const { error } = await supabase
        .from("mystery_shopper_questions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      return templateId;
    },
    onSuccess: (templateId) => {
      queryClient.invalidateQueries({ queryKey: ["mystery-shopper-questions", templateId] });
      toast.success("Question deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete question: " + error.message);
    },
  });
};
