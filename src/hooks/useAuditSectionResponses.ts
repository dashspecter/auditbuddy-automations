import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AuditSectionResponse {
  id: string;
  audit_id: string;
  section_id: string;
  follow_up_needed: boolean;
  follow_up_notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Get section responses for an audit
export const useAuditSectionResponses = (auditId: string | undefined) => {
  return useQuery({
    queryKey: ["audit_section_responses", auditId],
    queryFn: async () => {
      if (!auditId) return [];

      const { data, error } = await supabase
        .from("audit_section_responses")
        .select("*")
        .eq("audit_id", auditId);

      if (error) throw error;
      return data as AuditSectionResponse[];
    },
    enabled: !!auditId,
  });
};

// Save or update section response
export const useSaveSectionResponse = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      auditId,
      sectionId,
      followUpNeeded,
      followUpNotes,
    }: {
      auditId: string;
      sectionId: string;
      followUpNeeded: boolean;
      followUpNotes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("audit_section_responses")
        .upsert({
          audit_id: auditId,
          section_id: sectionId,
          follow_up_needed: followUpNeeded,
          follow_up_notes: followUpNotes || null,
          created_by: user.id,
        }, {
          onConflict: "audit_id,section_id"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["audit_section_responses", data.audit_id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
