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

interface UseEquipmentPaginatedOptions {
  locationId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export const useEquipmentPaginated = (options?: UseEquipmentPaginatedOptions) => {
  const { locationId, status, page = 1, pageSize = 20 } = options || {};
  
  return useQuery({
    queryKey: ["equipment-paginated", locationId, status, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      let query = supabase
        .from("equipment")
        .select(`
          *,
          locations (
            name,
            city
          )
        `, { count: 'exact' })
        .order("name")
        .range(from, to);

      if (locationId && locationId !== "__all__") {
        query = query.eq("location_id", locationId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return {
        data: data as Equipment[],
        count: count || 0,
        pageCount: Math.ceil((count || 0) / pageSize)
      };
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

      if (error) {
        console.error("Error fetching equipment:", error);
        throw error;
      }
      return data as Equipment;
    },
    enabled: !!id,
    retry: 1,
  });
};

export const useCreateEquipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (equipment: Omit<Equipment, "id" | "created_at" | "updated_at" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get user's company_id
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");

      const { data, error } = await supabase
        .from("equipment")
        .insert([{ ...equipment, created_by: user.id, company_id: companyUser.company_id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-paginated"] });
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
      queryClient.invalidateQueries({ queryKey: ["equipment-paginated"] });
      toast.success("Equipment updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update equipment: ${error.message}`);
    },
  });
};

// Equipment deletion is disabled - equipment can only be marked as inactive or transferred
