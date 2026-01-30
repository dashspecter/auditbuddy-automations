import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TrainingAssignment, TrainingSession, TrainingEvaluation } from "./useTrainingModules";

// Assignments
export const useTrainingAssignments = (filters?: {
  status?: string;
  traineeId?: string;
  trainerId?: string;
  moduleId?: string;
}) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["training_assignments", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("training_assignments")
        .select(`
          *,
          trainee:employees!training_assignments_trainee_employee_id_fkey(id, full_name, role),
          trainer:employees!training_assignments_trainer_employee_id_fkey(id, full_name),
          module:training_programs!training_assignments_module_id_fkey(id, name, duration_days, difficulty_level),
          location:locations(id, name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.traineeId) {
        query = query.eq("trainee_employee_id", filters.traineeId);
      }
      if (filters?.trainerId) {
        query = query.eq("trainer_employee_id", filters.trainerId);
      }
      if (filters?.moduleId) {
        query = query.eq("module_id", filters.moduleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TrainingAssignment[];
    },
    enabled: !!company?.id,
  });
};

export const useTrainingAssignment = (id: string | undefined) => {
  return useQuery({
    queryKey: ["training_assignment", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("training_assignments")
        .select(`
          *,
          trainee:employees!training_assignments_trainee_employee_id_fkey(id, full_name, role),
          trainer:employees!training_assignments_trainer_employee_id_fkey(id, full_name),
          module:training_programs!training_assignments_module_id_fkey(*),
          location:locations(id, name)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as unknown as TrainingAssignment;
    },
    enabled: !!id,
  });
};

export const useCreateTrainingAssignment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (assignment: Partial<TrainingAssignment>) => {
      if (!user || !company?.id) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("training_assignments")
        .insert({
          company_id: company.id,
          trainee_employee_id: assignment.trainee_employee_id!,
          module_id: assignment.module_id!,
          trainer_employee_id: assignment.trainer_employee_id,
          location_id: assignment.location_id,
          start_date: assignment.start_date!,
          status: assignment.status ?? 'planned',
          experience_level: assignment.experience_level,
          notes: assignment.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_assignments"] });
      toast.success("Training assignment created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });
};

export const useUpdateTrainingAssignment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrainingAssignment> & { id: string }) => {
      const { data, error } = await supabase
        .from("training_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training_assignments"] });
      queryClient.invalidateQueries({ queryKey: ["training_assignment", data.id] });
      toast.success("Assignment updated");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });
};

// Sessions
export const useTrainingSessions = (filters?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  assignmentId?: string;
}) => {
  const { company } = useCompanyContext();

  return useQuery({
    queryKey: ["training_sessions", company?.id, filters],
    queryFn: async () => {
      if (!company?.id) return [];

      let query = supabase
        .from("training_sessions")
        .select(`
          *,
          trainer:employees!training_sessions_trainer_employee_id_fkey(id, full_name),
          location:locations(id, name),
          module:training_programs(id, name),
          attendees:training_session_attendees(
            id,
            employee_id,
            attendee_role,
            employee:employees(id, full_name)
          )
        `)
        .eq("company_id", company.id)
        .order("session_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (filters?.date) {
        query = query.eq("session_date", filters.date);
      }
      if (filters?.startDate) {
        query = query.gte("session_date", filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte("session_date", filters.endDate);
      }
      if (filters?.assignmentId) {
        query = query.eq("assignment_id", filters.assignmentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TrainingSession[];
    },
    enabled: !!company?.id,
  });
};

// Helper: FK-safe rollback that never throws during cleanup
// Accepts supabaseClient as parameter to prevent hidden scope coupling
async function rollbackTrainingCreation(
  supabaseClient: typeof supabase,
  {
    sessionId,
    shiftId,
  }: {
    sessionId?: string;
    shiftId?: string;
  }
) {
  try {
    // Delete in FK-safe order: assignments → shift → attendees → session
    if (shiftId) {
      const { error: assignDelErr } = await supabaseClient
        .from("shift_assignments")
        .delete()
        .eq("shift_id", shiftId);
      if (assignDelErr) {
        console.error("[rollbackTrainingCreation] Failed to delete shift_assignments:", assignDelErr);
      }

      const { error: shiftDelErr } = await supabaseClient
        .from("shifts")
        .delete()
        .eq("id", shiftId);
      if (shiftDelErr) {
        console.error("[rollbackTrainingCreation] Failed to delete shift:", shiftDelErr);
      }
    }

    if (sessionId) {
      const { error: attendeeDelErr } = await supabaseClient
        .from("training_session_attendees")
        .delete()
        .eq("session_id", sessionId);
      if (attendeeDelErr) {
        console.error("[rollbackTrainingCreation] Failed to delete attendees:", attendeeDelErr);
      }

      const { error: sessionDelErr } = await supabaseClient
        .from("training_sessions")
        .delete()
        .eq("id", sessionId);
      if (sessionDelErr) {
        console.error("[rollbackTrainingCreation] Failed to delete session:", sessionDelErr);
      }
    }
  } catch (e) {
    console.error("[rollbackTrainingCreation] Unexpected rollback error:", e);
  }
}

export const useCreateTrainingSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (session: Partial<TrainingSession> & { traineeIds?: string[] }) => {
      if (!user || !company?.id) throw new Error("Not authenticated");

      // Prevent required_count=0 edge case - must have at least trainer or trainees
      const hasTrainer = !!session.trainer_employee_id;
      const hasTrainees = session.traineeIds && session.traineeIds.length > 0;
      if (!hasTrainer && !hasTrainees) {
        throw new Error("Select a trainer or at least one trainee");
      }

      // Create session first
      const { data: sessionData, error: sessionError } = await supabase
        .from("training_sessions")
        .insert({
          company_id: company.id,
          assignment_id: session.assignment_id,
          module_id: session.module_id,
          location_id: session.location_id!,
          session_date: session.session_date!,
          start_time: session.start_time!,
          end_time: session.end_time!,
          trainer_employee_id: session.trainer_employee_id,
          title: session.title,
          notes: session.notes,
          created_by: user.id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add trainer as attendee (with error check)
      if (session.trainer_employee_id) {
        const { error: trainerAttendeeErr } = await supabase
          .from("training_session_attendees")
          .insert({
            session_id: sessionData.id,
            employee_id: session.trainer_employee_id,
            attendee_role: 'trainer',
          });
        
        if (trainerAttendeeErr) {
          console.error("[useCreateTrainingSession] Trainer attendee insert failed, rolling back:", trainerAttendeeErr);
          await rollbackTrainingCreation(supabase, { sessionId: sessionData.id });
          throw new Error(`Failed to add trainer as attendee: ${trainerAttendeeErr.message}`);
        }
      }

      // Add trainees as attendees (with error check)
      if (session.traineeIds?.length) {
        const { error: traineeAttendeeErr } = await supabase
          .from("training_session_attendees")
          .insert(
            session.traineeIds.map(tid => ({
              session_id: sessionData.id,
              employee_id: tid,
              attendee_role: 'trainee',
            }))
          );
        
        if (traineeAttendeeErr) {
          console.error("[useCreateTrainingSession] Trainee attendees insert failed, rolling back:", traineeAttendeeErr);
          await rollbackTrainingCreation(supabase, { sessionId: sessionData.id });
          throw new Error(`Failed to add trainees as attendees: ${traineeAttendeeErr.message}`);
        }
      }

      // Calculate required_count safely (trainer may not exist)
      const traineeCount = session.traineeIds?.length || 0;
      const trainerCount = session.trainer_employee_id ? 1 : 0;
      const requiredCount = traineeCount + trainerCount;

      // Create corresponding training shift
      const { data: shiftData, error: shiftError } = await supabase
        .from("shifts")
        .insert({
          company_id: company.id,
          location_id: session.location_id!,
          shift_date: session.session_date!,
          start_time: session.start_time!,
          end_time: session.end_time!,
          role: 'Training',
          shift_type: 'training',
          training_session_id: sessionData.id,
          training_module_id: session.module_id,
          trainer_employee_id: session.trainer_employee_id,
          cohort_label: session.title,
          created_by: user.id,
          status: 'published',
          is_published: true,
          required_count: requiredCount,
        })
        .select()
        .single();

      if (shiftError) {
        console.error("[useCreateTrainingSession] Shift creation failed, rolling back session:", shiftError);
        await rollbackTrainingCreation(supabase, { sessionId: sessionData.id });
        throw new Error(`Failed to create training shift: ${shiftError.message}`);
      }
      
      // Build shift_assignments for trainer and trainees
      const assignmentsToInsert: Array<{
        shift_id: string;
        staff_id: string;
        status: string;
        assigned_by: string;
        approval_status: string;
      }> = [];

      if (session.trainer_employee_id) {
        assignmentsToInsert.push({
          shift_id: shiftData.id,
          staff_id: session.trainer_employee_id,
          status: 'assigned',
          assigned_by: user.id,
          approval_status: 'approved',
        });
      }

      if (session.traineeIds?.length) {
        session.traineeIds.forEach(traineeId => {
          assignmentsToInsert.push({
            shift_id: shiftData.id,
            staff_id: traineeId,
            status: 'assigned',
            assigned_by: user.id,
            approval_status: 'approved',
          });
        });
      }

      if (assignmentsToInsert.length > 0) {
        const { error: assignError } = await supabase
          .from("shift_assignments")
          .upsert(assignmentsToInsert, { 
            onConflict: 'shift_id,staff_id', 
            ignoreDuplicates: true 
          });
        
        if (assignError) {
          console.error("[useCreateTrainingSession] Assignment creation failed, rolling back:", assignError);
          await rollbackTrainingCreation(supabase, { sessionId: sessionData.id, shiftId: shiftData.id });
          throw new Error(`Failed to create shift assignments: ${assignError.message}`);
        }
        
        if (import.meta.env.DEV) {
          console.log("[useCreateTrainingSession] Created shift assignments:", {
            shiftId: shiftData.id,
            assignmentsCount: assignmentsToInsert.length,
            trainerId: session.trainer_employee_id,
            traineeIds: session.traineeIds,
          });
        }
      }

      return sessionData;
    },
    onSuccess: () => {
      // Invalidate training + schedule queries using predicate to catch parameterized keys
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          Array.isArray(query.queryKey) && query.queryKey[0] === "shifts" 
      });
      // Invalidate both key variants until standardized
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shift_assignments"] });
      toast.success("Training session created");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create session: ${error.message}`);
    },
  });
};

// Evaluations
export const useTrainingEvaluations = (assignmentId?: string) => {
  return useQuery({
    queryKey: ["training_evaluations", assignmentId],
    queryFn: async () => {
      if (!assignmentId) return [];

      const { data, error } = await supabase
        .from("training_evaluations")
        .select(`
          *,
          trainee:employees!training_evaluations_trainee_employee_id_fkey(id, full_name),
          trainer:employees!training_evaluations_trainer_employee_id_fkey(id, full_name),
          audit_instance:location_audits(id, status, overall_score, template:audit_templates(id, name))
        `)
        .eq("assignment_id", assignmentId)
        .order("evaluation_date", { ascending: false });

      if (error) throw error;
      return data as unknown as TrainingEvaluation[];
    },
    enabled: !!assignmentId,
  });
};

export const useCreateTrainingEvaluation = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();

  return useMutation({
    mutationFn: async (evaluation: Partial<TrainingEvaluation>) => {
      if (!company?.id) throw new Error("No company context");

      const { data, error } = await supabase
        .from("training_evaluations")
        .insert({
          company_id: company.id,
          assignment_id: evaluation.assignment_id!,
          session_id: evaluation.session_id,
          module_day_id: evaluation.module_day_id,
          trainee_employee_id: evaluation.trainee_employee_id!,
          trainer_employee_id: evaluation.trainer_employee_id!,
          evaluation_date: evaluation.evaluation_date!,
          score: evaluation.score,
          passed: evaluation.passed,
          notes: evaluation.notes,
          audit_instance_id: evaluation.audit_instance_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_evaluations"] });
      toast.success("Evaluation saved");
    },
    onError: (error: Error) => {
      toast.error(`Failed to save evaluation: ${error.message}`);
    },
  });
};

// Start an audit-based evaluation (create audit instance and link to training evaluation)
export const useStartAuditEvaluation = () => {
  const queryClient = useQueryClient();
  const { company } = useCompanyContext();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      assignmentId: string;
      traineeEmployeeId: string;
      trainerEmployeeId: string;
      moduleDayId?: string;
      auditTemplateId: string;
      locationId?: string;
    }) => {
      if (!company?.id || !user) throw new Error("Not authenticated");

      // ALWAYS get a valid location name for the audit (location column is NOT NULL text)
      // This is REQUIRED - the DB constraint will reject null values
      let locationName = 'Training Evaluation';
      
      if (params.locationId) {
        const { data: loc, error: locError } = await supabase
          .from("locations")
          .select("name")
          .eq("id", params.locationId)
          .single();
        
        if (!locError && loc?.name) {
          locationName = loc.name;
        }
        // If location fetch fails, we still use the default 'Training Evaluation'
      }

      // Create the audit instance using correct column names:
      // - template_id (NOT audit_template_id)
      // - audit_date (date type)
      // - location (NOT NULL text - always provide a value)
      const { data: auditInstance, error: auditError } = await supabase
        .from("location_audits")
        .insert({
          company_id: company.id,
          user_id: user.id,
          template_id: params.auditTemplateId,
          location_id: params.locationId || null,
          audit_date: new Date().toISOString().split('T')[0],
          status: 'in_progress',
          location: locationName, // CRITICAL: NOT NULL - always provide a valid string
        })
        .select()
        .single();

      if (auditError) {
        console.error("[useStartAuditEvaluation] Failed to create audit instance:", auditError);
        throw new Error(`Failed to create audit: ${auditError.message}`);
      }

      // Create the training evaluation linking to the audit
      const { data: evaluation, error: evalError } = await supabase
        .from("training_evaluations")
        .insert({
          company_id: company.id,
          assignment_id: params.assignmentId,
          module_day_id: params.moduleDayId || null,
          trainee_employee_id: params.traineeEmployeeId,
          trainer_employee_id: params.trainerEmployeeId,
          evaluation_date: new Date().toISOString().split('T')[0],
          audit_instance_id: auditInstance.id,
        })
        .select()
        .single();

      if (evalError) {
        // Rollback: delete the audit instance if evaluation creation fails
        console.error("[useStartAuditEvaluation] Failed to create evaluation, rolling back audit:", evalError);
        await supabase.from("location_audits").delete().eq("id", auditInstance.id);
        throw new Error(`Failed to create evaluation: ${evalError.message}`);
      }

      return { evaluation, auditInstance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training_evaluations"] });
      toast.success("Evaluation started");
    },
    onError: (error: Error) => {
      toast.error(`Failed to start evaluation: ${error.message}`);
    },
  });
};

// Generate training sessions (shifts) for an assignment
export const useGenerateTrainingSessions = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      params: string | { assignmentId: string; defaultStartTime?: string; defaultEndTime?: string }
    ) => {
      if (!user) throw new Error("Not authenticated");

      // Support both old (string) and new (object) API
      const assignmentId = typeof params === "string" ? params : params.assignmentId;
      const customStartTime = typeof params === "object" ? params.defaultStartTime : undefined;
      const customEndTime = typeof params === "object" ? params.defaultEndTime : undefined;

      // Fetch assignment with module info
      const { data: assignment, error: assignmentError } = await supabase
        .from("training_assignments")
        .select(`
          *,
          module:training_programs(id, name, duration_days),
          location:locations(id, name)
        `)
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;
      if (!assignment.module) throw new Error("Module not found");
      if (!assignment.company_id) throw new Error("Assignment is missing company_id");

      const startDate = new Date(assignment.start_date);
      const durationDays = assignment.module.duration_days || 5;
      const createdSessions: any[] = [];
      let firstError: any = null;

      // Use custom times if provided, otherwise default (9:00-17:00)
      const defaultStartTime = customStartTime || "09:00:00";
      const defaultEndTime = customEndTime || "17:00:00";

      // Get existing sessions to avoid duplicates
      const { data: existingSessions, error: existingSessionsError } = await supabase
        .from("training_sessions")
        .select("session_date")
        .eq("assignment_id", assignmentId);

      if (existingSessionsError) {
        // Don’t hard-fail if this lookup fails; we can still try to create.
        console.error("[Training] Failed to fetch existing sessions:", existingSessionsError);
      }

      const existingDates = new Set((existingSessions || []).map(s => s.session_date));

      // Create a session for each training day
      for (let dayOffset = 0; dayOffset < durationDays; dayOffset++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(sessionDate.getDate() + dayOffset);
        
        // Skip weekends
        const dayOfWeek = sessionDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          continue;
        }

        const dateStr = sessionDate.toISOString().split('T')[0];
        
        // Skip if session already exists for this date
        if (existingDates.has(dateStr)) {
          continue;
        }

        // Create the training session
        const { data: session, error: sessionError } = await supabase
          .from("training_sessions")
          .insert({
            company_id: assignment.company_id,
            assignment_id: assignmentId,
            module_id: assignment.module_id,
            location_id: assignment.location_id,
            session_date: dateStr,
            start_time: defaultStartTime,
            end_time: defaultEndTime,
            trainer_employee_id: assignment.trainer_employee_id,
            title: `${assignment.module.name} - Day ${dayOffset + 1}`,
            created_by: user.id,
          })
          .select()
          .single();

        if (sessionError) {
          if (!firstError) firstError = sessionError;
          console.error(`Failed to create session for day ${dayOffset + 1}:`, sessionError);
          console.error("[Training] Session error details:", {
            code: (sessionError as any)?.code,
            message: (sessionError as any)?.message,
            details: (sessionError as any)?.details,
            hint: (sessionError as any)?.hint,
          });
          continue;
        }

        // Add trainer as attendee
        if (assignment.trainer_employee_id) {
          const { error: trainerAttendeeErr } = await supabase.from("training_session_attendees").insert({
            session_id: session.id,
            employee_id: assignment.trainer_employee_id,
            attendee_role: 'trainer',
          });

          if (trainerAttendeeErr) {
            if (!firstError) firstError = trainerAttendeeErr;
            console.error("[Training] Failed to add trainer attendee:", trainerAttendeeErr);
          }
        }

        // Add trainee as attendee
        const { error: traineeAttendeeErr } = await supabase.from("training_session_attendees").insert({
          session_id: session.id,
          employee_id: assignment.trainee_employee_id,
          attendee_role: 'trainee',
        });

        if (traineeAttendeeErr) {
          if (!firstError) firstError = traineeAttendeeErr;
          console.error("[Training] Failed to add trainee attendee:", traineeAttendeeErr);
        }

        // Calculate required_count
        const requiredCount = (assignment.trainer_employee_id ? 1 : 0) + 1; // trainer + trainee

        // Create corresponding shift
        const { data: shift, error: shiftError } = await supabase
          .from("shifts")
          .insert({
            company_id: assignment.company_id,
            location_id: assignment.location_id,
            shift_date: dateStr,
            start_time: defaultStartTime,
            end_time: defaultEndTime,
            role: 'Training',
            shift_type: 'training',
            training_session_id: session.id,
            training_module_id: assignment.module_id,
            trainer_employee_id: assignment.trainer_employee_id,
            cohort_label: `${assignment.module.name} - Day ${dayOffset + 1}`,
            created_by: user.id,
            status: 'published',
            is_published: true,
            required_count: requiredCount,
          })
          .select()
          .single();

        if (shiftError) {
          if (!firstError) firstError = shiftError;
          console.error(`Failed to create shift for day ${dayOffset + 1}:`, shiftError);
          continue;
        }

        // Create shift assignments for trainer and trainee
        const shiftAssignments = [];
        const assignedAt = new Date().toISOString();
        
        if (assignment.trainer_employee_id) {
          shiftAssignments.push({
            shift_id: shift.id,
            staff_id: assignment.trainer_employee_id,
            status: 'assigned',
            assigned_by: user.id,
            assigned_at: assignedAt,
            approval_status: 'approved',
          });
        }

        shiftAssignments.push({
          shift_id: shift.id,
          staff_id: assignment.trainee_employee_id,
          status: 'assigned',
          assigned_by: user.id,
          assigned_at: assignedAt,
          approval_status: 'approved',
        });

        const { error: shiftAssignmentsError } = await supabase.from("shift_assignments").insert(shiftAssignments);
        if (shiftAssignmentsError) {
          if (!firstError) firstError = shiftAssignmentsError;
          console.error("[Training] Failed to create shift assignments:", shiftAssignmentsError);
          // Best-effort: keep the session + shift (schedule still visible), but report the issue.
        }

        createdSessions.push(session);
      }

      if (createdSessions.length === 0 && firstError) {
        const msg =
          (firstError as any)?.message ||
          (firstError as any)?.details ||
          "Failed to schedule training sessions";
        throw new Error(msg);
      }

      return createdSessions;
    },
    onSuccess: (sessions) => {
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({ predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === "shifts" });
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["shift_assignments"] });
      toast.success(`Scheduled ${sessions.length} training days`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to schedule sessions: ${error.message}`);
    },
  });
};

// Generate tasks for assignment
export const useGenerateTrainingTasks = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Fetch assignment details
      const { data: assignment, error: assignmentError } = await supabase
        .from("training_assignments")
        .select(`
          *,
          module:training_programs(
            id,
            name,
            duration_days
          )
        `)
        .eq("id", assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Two-phase fetch: First fetch days, then fetch tasks separately
      // (PostgREST nested join fails without FK constraint)
      const { data: days, error: daysError } = await supabase
        .from("training_module_days")
        .select("*")
        .eq("module_id", assignment.module_id)
        .order("day_number");

      if (daysError) throw daysError;
      
      console.log("[Training] Module days fetched:", days);
      console.log("[Training] Assignment module_id:", assignment.module_id);

      // Fetch all tasks for these days
      const dayIds = (days || []).map(d => d.id);
      let allTasks: any[] = [];
      
      if (dayIds.length > 0) {
        const { data: tasks, error: tasksError } = await supabase
          .from("training_module_day_tasks")
          .select("*")
          .in("module_day_id", dayIds)
          .order("sort_order");
        
        if (tasksError) {
          console.error("[Training] Failed to fetch day tasks:", tasksError);
        } else {
          allTasks = tasks || [];
          console.log("[Training] Found", allTasks.length, "template tasks across", dayIds.length, "days");
        }
      }

      // Group tasks by day
      const tasksByDayId = allTasks.reduce((acc: Record<string, any[]>, task: any) => {
        if (!acc[task.module_day_id]) acc[task.module_day_id] = [];
        acc[task.module_day_id].push(task);
        return acc;
      }, {});

      // Attach tasks to days
      const daysWithTasks = (days || []).map(day => ({
        ...day,
        tasks: tasksByDayId[day.id] || []
      }));

      const startDate = new Date(assignment.start_date);
      const generatedTasks: any[] = [];

      // Generate tasks for each day
      for (const day of daysWithTasks) {
        console.log("[Training] Processing day:", day.day_number, "with tasks:", day.tasks?.length || 0);
        const scheduledDate = new Date(startDate);
        scheduledDate.setDate(scheduledDate.getDate() + day.day_number - 1);
        const dateStr = scheduledDate.toISOString().split('T')[0];

        for (const templateTask of day.tasks || []) {
          console.log("[Training] Creating task from template:", templateTask.task_title);
          // Check if already generated
          const { data: existing } = await supabase
            .from("training_generated_tasks")
            .select("id")
            .eq("assignment_id", assignmentId)
            .eq("template_task_id", templateTask.id)
            .eq("scheduled_date", dateStr)
            .maybeSingle();

          if (existing) continue;

          // Create task in tasks table
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              company_id: assignment.company_id,
              title: templateTask.task_title,
              description: templateTask.task_description,
              status: 'pending',
              priority: 'medium',
              // REQUIRED (NOT NULL)
              source: 'training',
              execution_mode: 'assigned',
              assigned_to: assignment.trainee_employee_id,
              location_id: assignment.location_id,
              start_at: `${dateStr}T09:00:00`,
              due_at: `${dateStr}T17:00:00`,
              created_by: user.id,
              // keeps tasks visible as personal assignments
              is_individual: true,
              // optional but useful for traceability
              source_reference_id: assignmentId,
            })
            .select()
            .single();

          if (taskError) {
            console.error("Failed to create task:", taskError);
            console.error("[Training] Task error details:", {
              code: (taskError as any)?.code,
              message: (taskError as any)?.message,
              details: (taskError as any)?.details,
              hint: (taskError as any)?.hint,
            });
            continue;
          }

          // Link to training
          await supabase
            .from("training_generated_tasks")
            .insert({
              assignment_id: assignmentId,
              module_day_id: day.id,
              template_task_id: templateTask.id,
              task_id: task.id,
              scheduled_date: dateStr,
            });

          generatedTasks.push(task);
        }
      }

      return generatedTasks;
    },
    onSuccess: (tasks) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["training_generated_tasks"] });
      toast.success(`Generated ${tasks.length} training tasks`);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate tasks: ${error.message}`);
    },
  });
};
