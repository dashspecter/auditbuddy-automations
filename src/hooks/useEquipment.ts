import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Equipment {
  id: string;
  location_id: string;
  name: string;
  model_type: string | null;
  power_supply_type: string | null;
  power_consumption: string | null;
  date_added: string;
  last_check_date: string | null;
  next_check_date: string | null;
  last_check_notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  locations?: {
    name: string;
    city: string | null;
  };
}

export const useEquipment = (locationId?: string, status?: string) => {
  return useQuery({
    queryKey: ["equipment", locationId, status],
    queryFn: async () => {
      let query = supabase
        .from("equipment")
        .select(`
          *,
          locations (
            name,
            city
          )
        `)
        .order("name");

      if (locationId && locationId !== "__all__") {
        query = query.eq("location_id", locationId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Equipment[];
    },
  });
};

export const useEquipmentById = (id: string) => {
  return useQuery({
    queryKey: ["equipment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *,
          locations (
            name,
            city
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Equipment;
    },
    enabled: !!id,
  });
};

export const useCreateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: Omit<Equipment, "id" | "created_at" | "updated_at">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("equipment")
        .insert([{ ...equipment, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipment added successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add equipment: ${error.message}`);
    },
  });
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...equipment }: Partial<Equipment> & { id: string }) => {
      const { data, error } = await supabase
        .from("equipment")
        .update(equipment)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update equipment: ${error.message}`);
    },
  });
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast.success("Equipment deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete equipment: ${error.message}`);
    },
  });
};
