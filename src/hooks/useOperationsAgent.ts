import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";

// Types
export interface DailyOps {
  id: string;
  company_id: string;
  location_id: string;
  date: string;
  checklist_json: ChecklistItem[];
  status: "draft" | "in_progress" | "completed";
  issues_found_json: Issue[];
  location_health_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  source: string;
  completed: boolean;
}

export interface Issue {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  detected_at: string;
}

export interface SLAConfig {
  id: string;
  company_id: string;
  location_id: string | null;
  sla_name: string;
  description: string | null;
  rules_json: SLARule[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SLARule {
  metric: string;
  operator: string;
  threshold: number;
  action: string;
}

export interface SLAEvent {
  id: string;
  company_id: string;
  location_id: string;
  sla_config_id: string;
  occurred_at: string;
  status: "triggered" | "resolved" | "acknowledged";
  details_json: Record<string, unknown>;
  created_at: string;
}

export interface MaintenanceTask {
  id: string;
  company_id: string;
  location_id: string;
  equipment_id: string | null;
  task_type: string;
  scheduled_for: string;
  completed_at: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "overdue";
  notes: string | null;
  created_by_agent: boolean;
  created_at: string;
  updated_at: string;
}

// Daily Ops Hooks
export function useDailyOps(locationId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["daily-ops", company?.id, locationId],
    queryFn: async () => {
      let query = supabase
        .from("location_daily_ops")
        .select("*")
        .eq("company_id", company?.id)
        .order("date", { ascending: false });

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as DailyOps[];
    },
    enabled: !!company?.id,
  });
}

export function useDailyOpsDetail(id: string) {
  return useQuery({
    queryKey: ["daily-ops-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("location_daily_ops")
        .select("*, location:location_id(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as DailyOps & { location: { name: string } };
    },
    enabled: !!id,
  });
}

export function useUpdateDailyOps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DailyOps> & { id: string }) => {
      const { data, error } = await supabase
        .from("location_daily_ops")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-ops"] });
    },
  });
}

// SLA Config Hooks
export function useSLAConfigs(locationId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["sla-configs", company?.id, locationId],
    queryFn: async () => {
      let query = supabase
        .from("location_sla_configs")
        .select("*, location:location_id(name)")
        .eq("company_id", company?.id)
        .order("created_at", { ascending: false });

      if (locationId) {
        query = query.or(`location_id.eq.${locationId},location_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as (SLAConfig & { location: { name: string } | null })[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateSLAConfig() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (config: Omit<SLAConfig, "id" | "company_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("location_sla_configs")
        .insert({ ...config, company_id: company?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-configs"] });
    },
  });
}

export function useUpdateSLAConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SLAConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from("location_sla_configs")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-configs"] });
    },
  });
}

export function useDeleteSLAConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("location_sla_configs")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-configs"] });
    },
  });
}

// SLA Events Hooks
export function useSLAEvents(locationId?: string) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["sla-events", company?.id, locationId],
    queryFn: async () => {
      let query = supabase
        .from("sla_events")
        .select("*, sla_config:sla_config_id(sla_name), location:location_id(name)")
        .eq("company_id", company?.id)
        .order("occurred_at", { ascending: false });

      if (locationId) {
        query = query.eq("location_id", locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (SLAEvent & { sla_config: { sla_name: string }; location: { name: string } })[];
    },
    enabled: !!company?.id,
  });
}

// Maintenance Tasks Hooks
export function useMaintenanceTasks(filters?: { locationId?: string; status?: string }) {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["maintenance-tasks", company?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_tasks")
        .select("*, location:location_id(name), equipment:equipment_id(name)")
        .eq("company_id", company?.id)
        .order("scheduled_for", { ascending: true });

      if (filters?.locationId) {
        query = query.eq("location_id", filters.locationId);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (MaintenanceTask & { location: { name: string }; equipment: { name: string } | null })[];
    },
    enabled: !!company?.id,
  });
}

export function useCreateMaintenanceTask() {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (task: Omit<MaintenanceTask, "id" | "company_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("maintenance_tasks")
        .insert({ ...task, company_id: company?.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tasks"] });
    },
  });
}

export function useUpdateMaintenanceTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenanceTask> & { id: string }) => {
      const { data, error } = await supabase
        .from("maintenance_tasks")
        .update(updates as never)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-tasks"] });
    },
  });
}

// Agent Actions
export function useRunOperationsAgent() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, goal, mode }: { locationId: string; goal?: string; mode?: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/operations-agent/run`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            company_id: company?.id,
            location_id: locationId,
            goal,
            mode: mode || "simulate",
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to run agent");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-ops"] });
      queryClient.invalidateQueries({ queryKey: ["maintenance-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["sla-events"] });
    },
  });
}

export function useGenerateDailyOps() {
  const { company } = useCompanyContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ locationId, date }: { locationId: string; date: string }) => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/operations-agent/generate-daily-ops`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            company_id: company?.id,
            location_id: locationId,
            date,
          }),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate daily ops");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-ops"] });
    },
  });
}
