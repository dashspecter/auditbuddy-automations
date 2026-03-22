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

const SESSION_EXPIRED_MSG = "Your session has expired. Please log in again.";

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
      let activeUser = user;
      if (!activeUser) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) throw new Error(SESSION_EXPIRED_MSG);
        const { data: { user: refreshedUser } } = await supabase.auth.getUser();
        if (!refreshedUser) throw new Error("Not authenticated");
        activeUser = refreshedUser;
      }

      const { error } = await supabase
        .from("audit_section_responses")
        .upsert({
          audit_id: auditId,
          section_id: sectionId,
          follow_up_needed: followUpNeeded,
          follow_up_notes: followUpNotes || null,
          created_by: activeUser.id,
        }, {
          onConflict: "audit_id,section_id"
        });

      if (error) throw error;
      return { audit_id: auditId };
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: (data) => {
      // Skip aggressive refetch — data is kept in local state
      const queryKey = ["audit_section_responses", data.audit_id];
      const existing = queryClient.getQueryData(queryKey);
      if (!existing) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error: Error) => {
      const message = error.message === SESSION_EXPIRED_MSG
        ? SESSION_EXPIRED_MSG
        : error.message?.includes("row-level security") || error.message?.includes("location_not_set")
          ? "Draft not ready — please ensure a location is selected before saving."
          : error.message;
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};
