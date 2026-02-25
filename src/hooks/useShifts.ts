import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getToastError } from "@/lib/errorMessages";

export interface Shift {
  id: string;
  company_id: string;
  location_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role: string;
  required_count: number;
  notes: string | null;
  created_at: string;
  created_by: string;
  creator_name?: string | null;
  is_published?: boolean;
  is_open_shift?: boolean;
  close_duty?: boolean;
  break_duration_minutes?: number;
  breaks?: Array<{ start: string; end: string }>;
  shift_type?: 'regular' | 'training' | 'extra' | null;
  training_session_id?: string | null;
  training_module_id?: string | null;
  trainer_employee_id?: string | null;
  cohort_label?: string | null;
  locations?: {
    name: string;
  };
  shift_assignments?: Array<{
    id: string;
    staff_id: string;
    shift_id: string;
    approval_status: string;
  }>;
  training_session?: {
    id: string;
    title: string | null;
    trainer?: { id: string; full_name: string } | null;
    attendees?: Array<{
      id: string;
      employee_id: string;
      attendee_role: string;
      employee?: { id: string; full_name: string };
    }>;
  } | null;
  training_module?: {
    id: string;
    name: string;
  } | null;
}

export const useShifts = (locationId?: string, startDate?: string, endDate?: string, shiftTypeFilter?: 'all' | 'regular' | 'training') => {
  // Normalize inputs for consistent behavior
  const normalizedLocationId = (!locationId || locationId === 'all') ? null : locationId;
  const normalizedType = shiftTypeFilter ?? 'all';
  
  return useQuery({
    // Include normalized values in cache key for proper cache management
    queryKey: ["shifts", normalizedLocationId ?? 'all', startDate, endDate, normalizedType],
    queryFn: async () => {
      // IMPORTANT: keep this base query extremely stable.
      // Training-related joins have caused /rest/v1/shifts to 500 in the past (e.g. due to RLS/policy recursion).
      // We therefore fetch training details in follow-up queries and merge client-side.
      let query = supabase
        .from("shifts")
        .select(`
          *,
          locations(name),
          shift_assignments(id, staff_id, shift_id, approval_status)
        `);
      
      // Apply location filter ONLY if we have a real location ID
      if (normalizedLocationId) {
        query = query.eq("location_id", normalizedLocationId);
      }
      
      // Apply date range filters
      if (startDate) {
        query = query.gte("shift_date", startDate);
      }
      if (endDate) {
        query = query.lte("shift_date", endDate);
      }
      
      // Filter by shift type - handle 'all', 'regular', and 'training'
      if (normalizedType === 'training') {
        query = query.eq('shift_type', 'training');
      } else if (normalizedType === 'regular') {
        // Include both explicit 'regular' AND legacy NULL shift_type rows
        query = query.or('shift_type.eq.regular,shift_type.is.null');
      }
      // For 'all': no shift_type filter is applied
      
      // Apply ordering after all filters
      query = query
        .order("shift_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      const { data, error } = await query;
      
      // DEV-only diagnostic logging
      if (import.meta.env.DEV) {
        console.log('[useShifts] Query params:', {
          normalizedLocationId,
          startDate,
          endDate,
          normalizedType,
          resultCount: data?.length ?? 0,
          error: error?.message ?? null,
        });
      }
      
      if (error) {
        if (import.meta.env.DEV) {
          console.error("[useShifts] Base shifts query failed:", {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code,
          });
        }
        throw error;
      }

      const baseShifts = ((data as any[]) || []).map((shift: any) => ({
        ...shift,
        breaks: (shift.breaks || []) as Array<{ start: string; end: string }>,
        shift_assignments: shift.shift_assignments || [],
      }));

      // Follow-up: training session + module details (best-effort; MUST NOT break base shift loading)
      const trainingSessionIds = Array.from(
        new Set(
          baseShifts
            .map((s: any) => s.training_session_id)
            .filter(Boolean)
        )
      ) as string[];

      const trainingModuleIds = Array.from(
        new Set(
          baseShifts
            .map((s: any) => s.training_module_id)
            .filter(Boolean)
        )
      ) as string[];

      const sessionsById = new Map<string, NonNullable<Shift["training_session"]>>();
      const modulesById = new Map<string, NonNullable<Shift["training_module"]>>();

      // Sessions (no joins)
      if (trainingSessionIds.length > 0) {
        const { data: sessions, error: sessionsErr } = await supabase
          .from("training_sessions")
          .select("id, title, trainer_employee_id")
          .in("id", trainingSessionIds);

        if (sessionsErr) {
          if (import.meta.env.DEV) {
            console.error("[useShifts] training_sessions fetch failed:", sessionsErr);
          }
        } else {
          (sessions || []).forEach((s: any) => {
            sessionsById.set(s.id, {
              id: s.id,
              title: s.title ?? null,
              trainer: null,
              attendees: [],
            });
          });

          // Trainers (employees)
          const trainerIds = Array.from(
            new Set((sessions || []).map((s: any) => s.trainer_employee_id).filter(Boolean))
          ) as string[];

          if (trainerIds.length > 0) {
            const { data: trainers, error: trainersErr } = await supabase
              .from("employees")
              .select("id, full_name")
              .in("id", trainerIds);

            if (trainersErr) {
              if (import.meta.env.DEV) {
                console.error("[useShifts] trainer employees fetch failed:", trainersErr);
              }
            } else {
              const trainerMap = new Map<string, any>((trainers || []).map((t: any) => [t.id, t]));
              (sessions || []).forEach((s: any) => {
                if (!s?.id) return;
                const sess = sessionsById.get(s.id);
                if (!sess) return;
                sess.trainer = s.trainer_employee_id ? (trainerMap.get(s.trainer_employee_id) || null) : null;
              });
            }
          }

          // Attendees (best-effort; do NOT join employees here to avoid join/policy issues)
          const { data: attendees, error: attendeesErr } = await supabase
            .from("training_session_attendees")
            .select("id, session_id, employee_id, attendee_role")
            .in("session_id", trainingSessionIds);

          if (attendeesErr) {
            if (import.meta.env.DEV) {
              console.error("[useShifts] training_session_attendees fetch failed:", attendeesErr);
            }
          } else {
            const employeeIds = Array.from(
              new Set((attendees || []).map((a: any) => a.employee_id).filter(Boolean))
            ) as string[];

            let employeeMap = new Map<string, any>();
            if (employeeIds.length > 0) {
              const { data: attendeeEmployees, error: attendeeEmployeesErr } = await supabase
                .from("employees")
                .select("id, full_name")
                .in("id", employeeIds);

              if (attendeeEmployeesErr) {
                if (import.meta.env.DEV) {
                  console.error("[useShifts] attendee employees fetch failed:", attendeeEmployeesErr);
                }
              } else {
                employeeMap = new Map<string, any>((attendeeEmployees || []).map((e: any) => [e.id, e]));
              }
            }

            (attendees || []).forEach((a: any) => {
              const sess = sessionsById.get(a.session_id);
              if (!sess) return;

              sess.attendees = sess.attendees || [];
              sess.attendees.push({
                id: a.id,
                employee_id: a.employee_id,
                attendee_role: a.attendee_role,
                employee: a.employee_id ? employeeMap.get(a.employee_id) : undefined,
              });
            });
          }
        }
      }

      // Modules (best-effort)
      if (trainingModuleIds.length > 0) {
        const { data: modules, error: modulesErr } = await supabase
          .from("training_programs")
          .select("id, name")
          .in("id", trainingModuleIds);

        if (modulesErr) {
          if (import.meta.env.DEV) {
            console.error("[useShifts] training_programs fetch failed:", modulesErr);
          }
        } else {
          (modules || []).forEach((m: any) => {
            modulesById.set(m.id, { id: m.id, name: m.name });
          });
        }
      }

      return baseShifts.map((shift: any) => ({
        ...shift,
        training_session: shift.training_session_id ? (sessionsById.get(shift.training_session_id) || null) : null,
        training_module: shift.training_module_id ? (modulesById.get(shift.training_module_id) || null) : null,
      })) as Shift[];
    },
  });
};

export const useCreateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (shift: Omit<Shift, "id" | "created_at" | "created_by" | "company_id">) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");
      
      const creatorName = user.user_metadata?.full_name || user.email || 'Unknown';
      
      const { data, error } = await supabase
        .from("shifts")
        .insert({ 
          ...shift, 
          created_by: user.id, 
          company_id: companyUser.company_id,
          creator_name: creatorName
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Shift created successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Shift> & { id: string }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Shift updated successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      toast.success("Shift deleted successfully");
    },
    onError: (error) => {
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};

export const useBulkPublishShifts = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ shiftIds, publish = true }: { shiftIds: string[]; publish?: boolean }) => {
      if (shiftIds.length === 0) return;
      
      const { error } = await supabase
        .from("shifts")
        .update({ is_published: publish })
        .in("id", shiftIds);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["pending-approvals"] });
      const action = variables.publish ? "published" : "unpublished";
      toast.success(`${variables.shiftIds.length} shift(s) ${action} successfully`);
    },
    onError: (error) => {
      const friendly = getToastError(error, 'shifts');
      toast.error(friendly.title, { description: friendly.description });
    },
  });
};
