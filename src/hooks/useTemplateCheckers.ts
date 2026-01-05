import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TemplateChecker {
  id: string;
  template_id: string;
  user_id: string;
  created_at: string;
}

export interface CheckerOption {
  user_id: string;
  full_name: string;
  email: string;
}

// Get all checker assignments for a template
export function useTemplateCheckers(templateId: string | undefined) {
  return useQuery({
    queryKey: ["template_checkers", templateId],
    enabled: !!templateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_template_checkers")
        .select("*")
        .eq("template_id", templateId);
      
      if (error) throw error;
      return data as TemplateChecker[];
    },
  });
}

// Get all employees with user accounts (potential checkers) for a company
export function useCompanyCheckers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["company_checkers", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("user_id, full_name, email")
        .eq("company_id", companyId)
        .not("user_id", "is", null);
      
      if (error) throw error;
      return (data || []).filter(e => e.user_id) as CheckerOption[];
    },
  });
}

// Assign checkers to a template
export function useAssignCheckers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ templateId, userIds }: { templateId: string; userIds: string[] }) => {
      if (!user) throw new Error("Not authenticated");

      // First delete existing assignments
      await supabase
        .from("audit_template_checkers")
        .delete()
        .eq("template_id", templateId);

      // Then insert new assignments
      if (userIds.length > 0) {
        const inserts = userIds.map(userId => ({
          template_id: templateId,
          user_id: userId,
          created_by: user.id,
        }));

        const { error } = await supabase
          .from("audit_template_checkers")
          .insert(inserts);

        if (error) throw error;
      }

      return { templateId, userIds };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["template_checkers", variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ["template_checkers"] });
    },
  });
}

// Get templates assigned to the current user (for staff view)
export function useAssignedTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["assigned_templates", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_template_checkers")
        .select("template_id")
        .eq("user_id", user!.id);
      
      if (error) throw error;
      return data.map(d => d.template_id);
    },
  });
}
