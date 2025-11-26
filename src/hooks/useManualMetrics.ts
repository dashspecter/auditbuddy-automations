import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ManualMetric {
  id: string;
  metric_name: string;
  metric_value: number;
  metric_date: string;
  location_id: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  locations?: {
    name: string;
  };
}

export const useManualMetrics = (locationId?: string, metricName?: string) => {
  return useQuery({
    queryKey: ["manual-metrics", locationId, metricName],
    queryFn: async () => {
      let query = supabase
        .from("manual_metrics")
        .select(`
          id,
          metric_name,
          metric_value,
          metric_date,
          location_id,
          notes,
          created_by,
          created_at,
          updated_at,
          locations(name)
        `)
        .order("metric_date", { ascending: false });
      
      if (locationId) {
        query = query.eq("location_id", locationId);
      }
      
      if (metricName) {
        query = query.eq("metric_name", metricName);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ManualMetric[];
    },
  });
};

export const useCreateManualMetric = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (metric: {
      metric_name: string;
      metric_value: number;
      metric_date: string;
      location_id?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("manual_metrics")
        .insert({
          ...metric,
          created_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
      toast.success("Metric added successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to add metric: " + error.message);
    },
  });
};

export const useUpdateManualMetric = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ManualMetric> & { id: string }) => {
      const { data, error } = await supabase
        .from("manual_metrics")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
      toast.success("Metric updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update metric: " + error.message);
    },
  });
};

export const useDeleteManualMetric = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("manual_metrics")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-metrics"] });
      toast.success("Metric deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete metric: " + error.message);
    },
  });
};

export const useMetricNames = () => {
  return useQuery({
    queryKey: ["manual-metrics-names"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_metrics")
        .select("metric_name")
        .order("metric_name");
      
      if (error) throw error;
      
      // Get unique metric names
      const uniqueNames = Array.from(new Set(data.map(m => m.metric_name)));
      return uniqueNames;
    },
  });
};
