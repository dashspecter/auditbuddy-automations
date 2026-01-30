import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TrainingDaySchedule {
  sessionId: string;
  shiftId: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  title: string | null;
  dayNumber: number;
}

/**
 * Fetches the training schedule (sessions + linked shifts) for an assignment.
 * Uses a two-phase fetch strategy to avoid deep joins.
 */
export const useTrainingSchedule = (assignmentId: string | undefined) => {
  return useQuery({
    queryKey: ["training_schedule", assignmentId],
    queryFn: async (): Promise<TrainingDaySchedule[]> => {
      if (!assignmentId) return [];

      // Phase 1: Fetch training sessions for this assignment
      const { data: sessions, error: sessionsError } = await supabase
        .from("training_sessions")
        .select("id, session_date, start_time, end_time, title")
        .eq("assignment_id", assignmentId)
        .order("session_date");

      if (sessionsError) {
        console.error("[useTrainingSchedule] Failed to fetch sessions:", sessionsError);
        throw sessionsError;
      }

      if (!sessions || sessions.length === 0) return [];

      // Phase 2: Fetch linked shifts (best-effort)
      const sessionIds = sessions.map(s => s.id);
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, training_session_id, start_time, end_time, shift_date")
        .in("training_session_id", sessionIds);

      if (shiftsError) {
        if (import.meta.env.DEV) {
          console.error("[useTrainingSchedule] Failed to fetch shifts:", shiftsError);
        }
      }

      // Build a map of session_id -> shift
      const shiftsBySessionId = new Map<string, { id: string; start_time: string; end_time: string }>();
      (shifts || []).forEach(shift => {
        if (shift.training_session_id) {
          shiftsBySessionId.set(shift.training_session_id, {
            id: shift.id,
            start_time: shift.start_time,
            end_time: shift.end_time,
          });
        }
      });

      // Combine into final schedule
      return sessions.map((session, index) => {
        const shift = shiftsBySessionId.get(session.id);
        return {
          sessionId: session.id,
          shiftId: shift?.id || null,
          sessionDate: session.session_date,
          // Prefer shift times (truth) over session times
          startTime: shift?.start_time || session.start_time || "09:00:00",
          endTime: shift?.end_time || session.end_time || "17:00:00",
          title: session.title,
          dayNumber: index + 1,
        };
      });
    },
    enabled: !!assignmentId,
  });
};

/**
 * Updates the time interval for a training day.
 * Updates both the shift and training_session to keep them in sync.
 */
export const useUpdateTrainingShiftTime = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      shiftId,
      startTime,
      endTime,
    }: {
      sessionId: string;
      shiftId: string | null;
      startTime: string;
      endTime: string;
    }) => {
      // Validate times
      if (startTime >= endTime) {
        throw new Error("End time must be after start time");
      }

      // Update shift first (this is the source of truth for the schedule)
      if (shiftId) {
        const { error: shiftError } = await supabase
          .from("shifts")
          .update({
            start_time: startTime,
            end_time: endTime,
          })
          .eq("id", shiftId);

        if (shiftError) {
          console.error("[useUpdateTrainingShiftTime] Shift update failed:", shiftError);
          throw new Error(`Failed to update shift: ${shiftError.message}`);
        }

        if (import.meta.env.DEV) {
          console.log("[useUpdateTrainingShiftTime] Updated shift:", shiftId, { startTime, endTime });
        }
      }

      // Also update training_session to keep in sync
      const { error: sessionError } = await supabase
        .from("training_sessions")
        .update({
          start_time: startTime,
          end_time: endTime,
        })
        .eq("id", sessionId);

      if (sessionError) {
        console.error("[useUpdateTrainingShiftTime] Session update failed:", sessionError);
        // Don't throw here - shift was already updated successfully
        // The shift is the source of truth for rendering
      }

      return { sessionId, shiftId, startTime, endTime };
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["training_schedule"] });
      queryClient.invalidateQueries({ queryKey: ["training_sessions"] });
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) && query.queryKey[0] === "shifts",
      });
      toast.success("Training time updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
