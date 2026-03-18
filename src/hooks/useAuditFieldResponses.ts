import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AuditFieldResponse {
  id: string;
  audit_id: string;
  field_id: string;
  section_id: string;
  response_value: any;
  observations: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  audit_field_photos: AuditFieldPhoto[];
  audit_field_attachments: AuditFieldAttachment[];
}

export interface AuditFieldPhoto {
  id: string;
  field_response_id: string;
  photo_url: string;
  caption: string | null;
  file_size: number | null;
  created_at: string;
  created_by: string;
}

export interface AuditFieldAttachment {
  id: string;
  field_response_id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  created_by: string;
}

const SESSION_EXPIRED_MSG = "Your session has expired. Please log in again.";
const DRAFT_NOT_READY_MSG = "Draft not ready — please ensure a location is selected before saving.";

async function refreshAndGetUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw new Error(SESSION_EXPIRED_MSG);

  const { data: { user: refreshedUser } } = await supabase.auth.getUser();
  if (!refreshedUser) throw new Error("Not authenticated");
  return refreshedUser;
}

function classifyError(error: Error): string {
  if (error.message === SESSION_EXPIRED_MSG) return SESSION_EXPIRED_MSG;
  if (error.message?.includes("row-level security") || error.message?.includes("location_not_set")) {
    return DRAFT_NOT_READY_MSG;
  }
  return error.message;
}

// Get field responses for an audit
export const useAuditFieldResponses = (auditId: string | undefined) => {
  return useQuery({
    queryKey: ["audit_field_responses", auditId],
    queryFn: async () => {
      if (!auditId) return [];

      const { data, error } = await supabase
        .from("audit_field_responses")
        .select(`
          *,
          audit_field_photos (*),
          audit_field_attachments (*)
        `)
        .eq("audit_id", auditId)
        .order("created_at");

      if (error) throw error;
      return data as AuditFieldResponse[];
    },
    enabled: !!auditId,
  });
};

// Save or update field response
export const useSaveFieldResponse = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      auditId,
      fieldId,
      sectionId,
      responseValue,
      observations,
    }: {
      auditId: string;
      fieldId: string;
      sectionId: string;
      responseValue: any;
      observations?: string;
    }) => {
      const user = await refreshAndGetUser();

      const { data, error } = await supabase
        .from("audit_field_responses")
        .upsert({
          audit_id: auditId,
          field_id: fieldId,
          section_id: sectionId,
          response_value: responseValue,
          observations: observations || null,
          created_by: user.id,
        }, {
          onConflict: "audit_id,field_id"
        })
        .select("id")
        .single();

      if (error) throw error;
      return { audit_id: auditId, id: data.id };
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["audit_field_responses", data.audit_id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: classifyError(error),
        variant: "destructive",
      });
    },
  });
};

// Upload field photo
export const useUploadFieldPhoto = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      auditId,
      file,
      caption,
    }: {
      responseId: string;
      auditId: string;
      file: File;
      caption?: string;
    }) => {
      const user = await refreshAndGetUser();

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${responseId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("audit-field-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("audit-field-attachments")
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("audit_field_photos")
        .insert({
          field_response_id: responseId,
          photo_url: publicUrl,
          caption: caption || null,
          file_size: file.size,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, auditId };
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: ({ auditId }) => {
      queryClient.invalidateQueries({ queryKey: ["audit_field_responses", auditId] });
      toast({
        title: "Success",
        description: "Photo uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: classifyError(error),
        variant: "destructive",
      });
    },
  });
};

// Upload field attachment
export const useUploadFieldAttachment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      auditId,
      file,
    }: {
      responseId: string;
      auditId: string;
      file: File;
    }) => {
      const user = await refreshAndGetUser();

      const filePath = `${user.id}/${responseId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("audit-field-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("audit-field-attachments")
        .getPublicUrl(filePath);

      const { data, error } = await supabase
        .from("audit_field_attachments")
        .insert({
          field_response_id: responseId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return { data, auditId };
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: ({ auditId }) => {
      queryClient.invalidateQueries({ queryKey: ["audit_field_responses", auditId] });
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: classifyError(error),
        variant: "destructive",
      });
    },
  });
};

// Delete field photo
export const useDeleteFieldPhoto = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, auditId }: { photoId: string; auditId: string }) => {
      await refreshAndGetUser();

      const { error } = await supabase
        .from("audit_field_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;
      return auditId;
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: (auditId) => {
      queryClient.invalidateQueries({ queryKey: ["audit_field_responses", auditId] });
      toast({
        title: "Success",
        description: "Photo deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: classifyError(error),
        variant: "destructive",
      });
    },
  });
};

// Delete field attachment
export const useDeleteFieldAttachment = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, auditId }: { attachmentId: string; auditId: string }) => {
      await refreshAndGetUser();

      const { error } = await supabase
        .from("audit_field_attachments")
        .delete()
        .eq("id", attachmentId);

      if (error) throw error;
      return auditId;
    },
    retry: 2,
    retryDelay: 1000,
    onSuccess: (auditId) => {
      queryClient.invalidateQueries({ queryKey: ["audit_field_responses", auditId] });
      toast({
        title: "Success",
        description: "Attachment deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: classifyError(error),
        variant: "destructive",
      });
    },
  });
};
