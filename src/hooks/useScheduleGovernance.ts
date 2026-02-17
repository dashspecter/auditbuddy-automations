import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCompany } from "./useCompany";
import { startOfWeek, format } from "date-fns";

// Types
export interface SchedulePeriod {
  id: string;
  company_id: string;
  location_id: string;
  week_start_date: string;
  state: 'draft' | 'published' | 'locked';
  published_at: string | null;
  published_by: string | null;
  locked_at: string | null;
  locked_by: string | null;
  publish_deadline: string | null;
  auto_lock_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ScheduleChangeRequest {
  id: string;
  company_id: string;
  location_id: string;
  period_id: string;
  status: 'pending' | 'approved' | 'denied';
  change_type: 'add' | 'edit' | 'delete';
  target_shift_id: string | null;
  payload_before: Record<string, any>;
  payload_after: Record<string, any>;
  reason_code: string | null;
  note: string | null;
  requested_by: string;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface WorkforcePolicy {
  id?: string;
  company_id: string;
  location_id: string | null;
  unscheduled_clock_in_policy: 'allow' | 'exception_ticket' | 'block';
  grace_minutes: number;
  block_publish_on_critical: boolean;
  require_reason_on_locked_edits: boolean;
  late_threshold_minutes: number;
  early_leave_threshold_minutes: number;
}

export interface WorkforceException {
  id: string;
  company_id: string;
  location_id: string;
  employee_id: string;
  exception_type: 'late_start' | 'early_leave' | 'unscheduled_shift' | 'no_show' | 'shift_extended' | 'overtime';
  status: 'pending' | 'approved' | 'denied' | 'resolved' | 'auto_resolved';
  shift_id: string | null;
  attendance_id: string | null;
  shift_date: string;
  detected_at: string;
  resolved_at: string | null;
  reason_code: string | null;
  note: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, any>;
  employees?: { full_name: string };
  locations?: { name: string };
}

// Reason codes for schedule changes
export const SCHEDULE_CHANGE_REASON_CODES = [
  { value: 'staffing_shortage', label: 'Staffing Shortage' },
  { value: 'employee_request', label: 'Employee Request' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'operational_issue', label: 'Operational Issue' },
  { value: 'schedule_error', label: 'Schedule Error' },
  { value: 'other', label: 'Other' },
] as const;

// Hook to check if schedule governance is enabled
export const useScheduleGovernanceEnabled = () => {
  const { data: company } = useCompany();
  return company?.enable_schedule_governance ?? false;
};

// Hook to get schedule period for a specific week and location
export const useSchedulePeriod = (locationId: string | null, weekStartDate: Date) => {
  const { data: company } = useCompany();
  const weekStart = format(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['schedule-period', company?.id, locationId, weekStart],
    queryFn: async () => {
      if (!company?.id || !locationId) return null;
      
      // Use RPC to get or create the period
      const { data, error } = await supabase.rpc('get_or_create_schedule_period', {
        p_company_id: company.id,
        p_location_id: locationId,
        p_week_start_date: weekStart
      });
      
      if (error) throw error;
      return data as SchedulePeriod;
    },
    enabled: !!company?.id && !!locationId && company?.enable_schedule_governance,
  });
};

// Hook to get all schedule periods for a week (all locations)
export const useSchedulePeriodsForWeek = (weekStartDate: Date) => {
  const { data: company } = useCompany();
  const weekStart = format(startOfWeek(weekStartDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  
  return useQuery({
    queryKey: ['schedule-periods-week', company?.id, weekStart],
    queryFn: async () => {
      if (!company?.id) return [];
      
      const { data, error } = await supabase
        .from('schedule_periods')
        .select('*')
        .eq('company_id', company.id)
        .eq('week_start_date', weekStart);
      
      if (error) throw error;
      return data as SchedulePeriod[];
    },
    enabled: !!company?.id && company?.enable_schedule_governance,
  });
};

// Mutation to publish schedule period
export const usePublishSchedulePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ periodId }: { periodId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('schedule_periods')
        .update({
          state: 'published',
          published_at: new Date().toISOString(),
          published_by: user.id
        })
        .eq('id', periodId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-period'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-periods-week'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Schedule published successfully');
    },
    onError: (error) => {
      toast.error('Failed to publish schedule: ' + error.message);
    },
  });
};

// Mutation to lock schedule period
export const useLockSchedulePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ periodId }: { periodId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('schedule_periods')
        .update({
          state: 'locked',
          locked_at: new Date().toISOString(),
          locked_by: user.id
        })
        .eq('id', periodId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-period'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-periods-week'] });
      toast.success('Schedule locked successfully');
    },
    onError: (error) => {
      toast.error('Failed to lock schedule: ' + error.message);
    },
  });
};

// Mutation to unlock schedule period (revert locked -> published)
export const useUnlockSchedulePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ periodId }: { periodId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('schedule_periods')
        .update({
          state: 'published',
          locked_at: null,
          locked_by: null
        })
        .eq('id', periodId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-period'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-periods-week'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Schedule unlocked — direct edits are now allowed');
    },
    onError: (error) => {
      toast.error('Failed to unlock schedule: ' + error.message);
    },
  });
};

// Mutation to publish and lock in one step
export const usePublishAndLockSchedulePeriod = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ periodId }: { periodId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('schedule_periods')
        .update({
          state: 'locked',
          published_at: now,
          published_by: user.id,
          locked_at: now,
          locked_by: user.id
        })
        .eq('id', periodId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-period'] });
      queryClient.invalidateQueries({ queryKey: ['schedule-periods-week'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Schedule published and locked');
    },
    onError: (error) => {
      toast.error('Failed to publish and lock: ' + error.message);
    },
  });
};

// Hook to get pending change requests
export const usePendingChangeRequests = (periodId?: string) => {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['schedule-change-requests', company?.id, periodId, 'pending'],
    queryFn: async () => {
      let query = supabase
        .from('schedule_change_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      if (periodId) {
        query = query.eq('period_id', periodId);
      } else if (company?.id) {
        query = query.eq('company_id', company.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduleChangeRequest[];
    },
    enabled: !!company?.id && company?.enable_schedule_governance,
  });
};

// Mutation to create a change request (for locked periods)
export const useCreateChangeRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (request: {
      company_id: string;
      location_id: string;
      period_id: string;
      change_type: 'add' | 'edit' | 'delete';
      target_shift_id?: string;
      payload_before?: Record<string, any>;
      payload_after: Record<string, any>;
      reason_code: string;
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('schedule_change_requests')
        .insert({
          ...request,
          requested_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Change request submitted for approval');
    },
    onError: (error) => {
      toast.error('Failed to submit change request: ' + error.message);
    },
  });
};

// Mutation to approve change request
export const useApproveChangeRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('apply_schedule_change_request', {
        p_request_id: requestId
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; result?: any };
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply change');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Change request approved and applied');
    },
    onError: (error) => {
      toast.error('Failed to approve: ' + error.message);
    },
  });
};

// Mutation to deny change request
export const useDenyChangeRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('schedule_change_requests')
        .update({
          status: 'denied',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-change-requests'] });
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      toast.success('Change request denied');
    },
    onError: (error) => {
      toast.error('Failed to deny: ' + error.message);
    },
  });
};

// Hook to get workforce exceptions
export const useWorkforceExceptions = (filters?: {
  locationId?: string;
  status?: WorkforceException['status'];
  startDate?: string;
  endDate?: string;
}) => {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['workforce-exceptions', company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];
      
      let query = supabase
        .from('workforce_exceptions')
        .select(`
          *,
          employees(full_name),
          locations(name)
        `)
        .eq('company_id', company.id)
        .order('detected_at', { ascending: false });
      
      if (filters?.locationId) {
        query = query.eq('location_id', filters.locationId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('shift_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('shift_date', filters.endDate);
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as WorkforceException[];
    },
    enabled: !!company?.id,
  });
};

// Mutation to resolve/approve workforce exception
export const useResolveWorkforceException = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exceptionId, status, note }: {
      exceptionId: string;
      status: 'approved' | 'denied' | 'resolved';
      note?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('workforce_exceptions')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          note: note || null
        })
        .eq('id', exceptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce-exceptions'] });
      toast.success('Exception resolved');
    },
    onError: (error) => {
      toast.error('Failed to resolve: ' + error.message);
    },
  });
};

// Hook to get workforce policy for a location
export const useWorkforcePolicy = (locationId?: string) => {
  const { data: company } = useCompany();
  
  return useQuery({
    queryKey: ['workforce-policy', company?.id, locationId],
    queryFn: async () => {
      if (!company?.id) return null;
      
      const { data, error } = await supabase.rpc('get_workforce_policy', {
        p_company_id: company.id,
        p_location_id: locationId || null
      });
      
      if (error) throw error;
      return data as WorkforcePolicy;
    },
    enabled: !!company?.id,
  });
};

// Mutation to save workforce policy
export const useSaveWorkforcePolicy = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (policy: Partial<WorkforcePolicy> & { company_id: string }) => {
      const { data, error } = await supabase
        .from('workforce_policies')
        .upsert(policy, { 
          onConflict: 'company_id,location_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce-policy'] });
      toast.success('Policy saved successfully');
    },
    onError: (error) => {
      toast.error('Failed to save policy: ' + error.message);
    },
  });
};
