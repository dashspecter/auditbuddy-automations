import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocumentRead {
  id: string;
  document_id: string;
  user_id: string | null;
  staff_id: string | null;
  read_at: string;
  confirmed_at: string | null;
  confirmed_understood: boolean | null;
}

export const useDocumentReads = (documentId: string | undefined) => {
  return useQuery({
    queryKey: ["document_reads", documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from("document_reads")
        .select("*")
        .eq("document_id", documentId)
        .order("read_at", { ascending: false });

      if (error) throw error;
      return data as DocumentRead[];
    },
    enabled: !!documentId,
  });
};

export const useMarkDocumentRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      documentId,
      confirmedUnderstood,
    }: {
      documentId: string;
      confirmedUnderstood: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("document_reads")
        .insert({
          document_id: documentId,
          user_id: user.id,
          confirmed_at: confirmedUnderstood ? new Date().toISOString() : null,
          confirmed_understood: confirmedUnderstood,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["document_reads", variables.documentId] });
      toast.success("Document marked as read");
    },
    onError: (error: Error) => {
      toast.error(`Failed to mark document as read: ${error.message}`);
    },
  });
};