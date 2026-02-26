import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Get a signed upload URL for scout evidence media.
 */
export function useScoutSignedUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      jobId: string;
      stepId: string;
      submissionId: string;
      fileName: string;
      contentType?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("scout-signed-upload", {
        body: params,
      });
      if (error) throw new Error(error.message || "Upload URL request failed");
      if (data?.error) throw new Error(data.error);
      return data as {
        signedUrl: string;
        token: string;
        storagePath: string;
        mediaId: string;
      };
    },
  });
}

/**
 * Upload a file to scout-evidence bucket using a signed URL,
 * then record the media row.
 */
export function useUploadScoutEvidence() {
  const queryClient = useQueryClient();
  const getUploadUrl = useScoutSignedUpload();

  return useMutation({
    mutationFn: async (params: {
      jobId: string;
      stepId: string;
      submissionId: string;
      file: File;
    }) => {
      // 1. Get signed upload URL
      const uploadInfo = await getUploadUrl.mutateAsync({
        jobId: params.jobId,
        stepId: params.stepId,
        submissionId: params.submissionId,
        fileName: params.file.name,
        contentType: params.file.type,
      });

      // 2. Upload the file to the signed URL
      const uploadRes = await fetch(uploadInfo.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": params.file.type },
        body: params.file,
      });
      if (!uploadRes.ok) {
        throw new Error("File upload failed");
      }

      // 3. Create scout_media record
      const mediaType = params.file.type.startsWith("video/") ? "video" : "photo";
      const { error: mediaErr } = await supabase.from("scout_media").insert({
        submission_id: params.submissionId,
        step_id: params.stepId,
        storage_path: uploadInfo.storagePath,
        media_type: mediaType,
        mime_type: params.file.type,
        size_bytes: params.file.size,
        captured_at: new Date().toISOString(),
      });
      if (mediaErr) throw mediaErr;

      return { storagePath: uploadInfo.storagePath, mediaId: uploadInfo.mediaId };
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ["scout-media", params.submissionId] });
      toast.success("Evidence uploaded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/**
 * Get a signed view URL for scout evidence media.
 */
export function useScoutSignedView() {
  return useMutation({
    mutationFn: async (storagePath: string) => {
      const { data, error } = await supabase.functions.invoke("scout-signed-view", {
        body: { storagePath },
      });
      if (error) throw new Error(error.message || "View URL request failed");
      if (data?.error) throw new Error(data.error);
      return data as { signedUrl: string };
    },
  });
}

/**
 * Get media for a submission (query).
 */
export { useScoutMedia } from "@/hooks/useScoutSubmissions";

/**
 * Generate evidence packet for a submission.
 */
export function useGenerateEvidencePacket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-evidence-packet", {
        body: { submissionId },
      });
      if (error) throw new Error(error.message || "Packet generation failed");
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; packetPath: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-submissions"] });
      toast.success("Evidence packet generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
