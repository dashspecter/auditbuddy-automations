import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EquipmentIntervention {
  id: string;
  equipment_id: string;
  location_id: string;
  title: string;
  scheduled_for: string;
  performed_at: string | null;
  performed_by_user_id: string;
  supervised_by_user_id: string | null;
  status: "scheduled" | "completed" | "overdue";
  description: string | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  notes: string | null;
  next_check_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  equipment?: {
    name: string;
    location_id: string;
  };
  locations?: {
    name: string;
  };
  performed_by?: {
    full_name: string | null;
    email: string;
  };
  supervised_by?: {
    full_name: string | null;
    email: string;
  };
}

export const useEquipmentInterventions = (equipmentId?: string, locationId?: string, userId?: string, status?: string) => {
  return useQuery({
    queryKey: ["equipment-interventions", equipmentId, locationId, userId, status],
    queryFn: async () => {
      let query = supabase
        .from("equipment_interventions")
        .select(`
          *,
          equipment (
            name,
            location_id
          ),
          locations (
            name
          ),
          performed_by:profiles!equipment_interventions_performed_by_user_id_fkey (
            full_name,
            email
          ),
          supervised_by:profiles!equipment_interventions_supervised_by_user_id_fkey (
            full_name,
            email
          )
        `)
        .order("scheduled_for", { ascending: false });

      if (equipmentId) {
        query = query.eq("equipment_id", equipmentId);
      }

      if (locationId && locationId !== "__all__") {
        query = query.eq("location_id", locationId);
      }

      if (userId) {
        query = query.or(`performed_by_user_id.eq.${userId},supervised_by_user_id.eq.${userId}`);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EquipmentIntervention[];
    },
  });
};

export const useEquipmentInterventionById = (id: string) => {
  return useQuery({
    queryKey: ["equipment-intervention", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_interventions")
        .select(`
          *,
          equipment (
            name,
            location_id
          ),
          locations (
            name
          ),
          performed_by:profiles!equipment_interventions_performed_by_user_id_fkey (
            full_name,
            email
          ),
          supervised_by:profiles!equipment_interventions_supervised_by_user_id_fkey (
            full_name,
            email
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as EquipmentIntervention;
    },
    enabled: !!id,
  });
};

export const useCreateEquipmentIntervention = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (intervention: Omit<EquipmentIntervention, "id" | "created_at" | "updated_at" | "created_by">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("equipment_interventions")
        .insert([{ ...intervention, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Intervention scheduled successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule intervention: ${error.message}`);
    },
  });
};

export const useUpdateEquipmentIntervention = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...intervention }: Partial<EquipmentIntervention> & { id: string }) => {
      const { data, error } = await supabase
        .from("equipment_interventions")
        .update(intervention)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-intervention"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Intervention updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update intervention: ${error.message}`);
    },
  });
};
