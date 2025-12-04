import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { addDays, addWeeks, differenceInDays, format, parseISO } from "date-fns";

interface CopyScheduleParams {
  sourceStartDate: string;
  sourceEndDate: string;
  numberOfCopies: number;
  locationId?: string;
  employeeId?: string;
  includeAssignments: boolean;
}

export const useCopySchedule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sourceStartDate,
      sourceEndDate,
      numberOfCopies,
      locationId,
      employeeId,
      includeAssignments,
    }: CopyScheduleParams) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user.id)
        .single();

      if (!companyUser) throw new Error("No company found for user");

      // Calculate period length in days
      const periodDays = differenceInDays(parseISO(sourceEndDate), parseISO(sourceStartDate)) + 1;

      // Fetch source shifts
      let shiftsQuery = supabase
        .from("shifts")
        .select(`
          *,
          shift_assignments(id, staff_id, approval_status)
        `)
        .eq("company_id", companyUser.company_id)
        .gte("shift_date", sourceStartDate)
        .lte("shift_date", sourceEndDate);

      if (locationId) {
        shiftsQuery = shiftsQuery.eq("location_id", locationId);
      }

      const { data: sourceShifts, error: shiftsError } = await shiftsQuery;
      if (shiftsError) throw shiftsError;

      if (!sourceShifts || sourceShifts.length === 0) {
        throw new Error("No shifts found in the selected period");
      }

      // Filter by employee if specified
      let filteredShifts = sourceShifts;
      if (employeeId && includeAssignments) {
        filteredShifts = sourceShifts.filter((shift: any) =>
          shift.shift_assignments?.some((a: any) => a.staff_id === employeeId)
        );
        if (filteredShifts.length === 0) {
          throw new Error("No shifts found for the selected employee");
        }
      }

      const createdShifts: any[] = [];
      const createdAssignments: any[] = [];

      // Create copies for each period
      for (let copyIndex = 1; copyIndex <= numberOfCopies; copyIndex++) {
        const dayOffset = periodDays * copyIndex;

        for (const sourceShift of filteredShifts) {
          const sourceDate = parseISO(sourceShift.shift_date);
          const newDate = addDays(sourceDate, dayOffset);

          // Create new shift
          const newShift = {
            company_id: companyUser.company_id,
            location_id: sourceShift.location_id,
            shift_date: format(newDate, "yyyy-MM-dd"),
            start_time: sourceShift.start_time,
            end_time: sourceShift.end_time,
            role: sourceShift.role,
            required_count: sourceShift.required_count,
            notes: sourceShift.notes,
            created_by: user.id,
            creator_name: user.user_metadata?.full_name || user.email || "Unknown",
            is_published: sourceShift.is_published || false,
            is_open_shift: sourceShift.is_open_shift || false,
            close_duty: sourceShift.close_duty || false,
            break_duration_minutes: sourceShift.break_duration_minutes,
            breaks: sourceShift.breaks,
          };

          const { data: createdShift, error: createError } = await supabase
            .from("shifts")
            .insert(newShift)
            .select()
            .single();

          if (createError) throw createError;
          createdShifts.push(createdShift);

          // Copy assignments if requested
          if (includeAssignments && sourceShift.shift_assignments?.length > 0) {
            const assignmentsToCreate = sourceShift.shift_assignments
              .filter((a: any) => !employeeId || a.staff_id === employeeId)
              .filter((a: any) => a.approval_status === "approved")
              .map((a: any) => ({
                shift_id: createdShift.id,
                staff_id: a.staff_id,
                assigned_by: user.id,
                approval_status: "approved",
                approved_by: user.id,
                approved_at: new Date().toISOString(),
              }));

            if (assignmentsToCreate.length > 0) {
              const { data: createdAssigns, error: assignError } = await supabase
                .from("shift_assignments")
                .insert(assignmentsToCreate)
                .select();

              if (assignError) {
                console.error("Error creating assignments:", assignError);
              } else {
                createdAssignments.push(...(createdAssigns || []));
              }
            }
          }
        }
      }

      return {
        shiftsCreated: createdShifts.length,
        assignmentsCreated: createdAssignments.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["shift-assignments"] });
      toast.success(
        `Schedule copied! Created ${result.shiftsCreated} shifts${
          result.assignmentsCreated > 0 ? ` and ${result.assignmentsCreated} assignments` : ""
        }`
      );
    },
    onError: (error: any) => {
      toast.error("Failed to copy schedule: " + error.message);
    },
  });
};
