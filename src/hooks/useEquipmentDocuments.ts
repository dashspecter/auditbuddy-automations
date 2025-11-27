import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { optimizeFile, formatFileSize } from "@/lib/fileOptimization";

export interface EquipmentDocument {
  id: string;
  equipment_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

export const useEquipmentDocuments = (equipmentId: string) => {
  return useQuery({
    queryKey: ["equipment-documents", equipmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_documents")
        .select("*")
        .eq("equipment_id", equipmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EquipmentDocument[];
    },
    enabled: !!equipmentId,
  });
};

export const useUploadEquipmentDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      file,
    }: {
      equipmentId: string;
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Optimize file (compress images, validate size for all files)
      const optimized = await optimizeFile(file);
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${equipmentId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("equipment-documents")
        .upload(fileName, optimized.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("equipment-documents")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("equipment_documents")
        .insert([{
          equipment_id: equipmentId,
          file_url: publicUrl,
          file_name: file.name,
          file_size: typeof optimized.file === 'string' ? 0 : optimized.file.size,
          uploaded_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Show optimization message if file was compressed
      if (optimized.wasCompressed) {
        toast.success(`File optimized to ${formatFileSize(optimized.file.size)}`);
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["equipment-documents", variables.equipmentId] });
      toast.success("Document uploaded successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
};

export const useDeleteEquipmentDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fileUrl, equipmentId }: { id: string; fileUrl: string; equipmentId: string }) => {
      const fileName = fileUrl.split("/").pop();
      if (fileName) {
        await supabase.storage
          .from("equipment-documents")
          .remove([fileName]);
      }

      const { error } = await supabase
        .from("equipment_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return equipmentId;
    },
    onSuccess: (equipmentId) => {
      queryClient.invalidateQueries({ queryKey: ["equipment-documents", equipmentId] });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });
};
