import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecurringSchedule {
  id: string;
  equipment_id: string;
  location_id: string;
  title: string;
  description: string | null;
  recurrence_pattern: string;
  start_time: string;
  assigned_user_id: string;
  supervisor_user_id: string | null;
  last_generated_date: string | null;
  day_of_week: number | null;
  day_of_month: number | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Get active recurring schedules that need processing
    const { data: schedules, error: fetchError } = await supabase
      .from("recurring_maintenance_schedules")
      .select("*")
      .eq("is_active", true)
      .or(`last_generated_date.is.null,last_generated_date.lt.${today}`);

    if (fetchError) {
      console.error("Error fetching schedules:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${schedules?.length || 0} schedules to process`);

    let processedCount = 0;

    for (const schedule of (schedules as RecurringSchedule[]) || []) {
      try {
        const nextDate = calculateNextDate(
          schedule.last_generated_date || schedule.start_time,
          schedule.recurrence_pattern,
          schedule.day_of_week,
          schedule.day_of_month
        );

        if (nextDate <= today) {
          // Create intervention
          const scheduledFor = `${nextDate}T${schedule.start_time}:00`;

          const { error: insertError } = await supabase
            .from("equipment_interventions")
            .insert({
              equipment_id: schedule.equipment_id,
              location_id: schedule.location_id,
              title: schedule.title,
              description: schedule.description,
              scheduled_for: scheduledFor,
              performed_by_user_id: schedule.assigned_user_id,
              supervised_by_user_id: schedule.supervisor_user_id,
              status: "scheduled",
              created_by: schedule.assigned_user_id,
            });

          if (insertError) {
            console.error(`Error creating intervention for schedule ${schedule.id}:`, insertError);
            continue;
          }

          // Update last_generated_date
          const { error: updateError } = await supabase
            .from("recurring_maintenance_schedules")
            .update({ last_generated_date: nextDate })
            .eq("id", schedule.id);

          if (updateError) {
            console.error(`Error updating schedule ${schedule.id}:`, updateError);
            continue;
          }

          processedCount++;
          console.log(`Created intervention for schedule ${schedule.id} on ${nextDate}`);
        }
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        total: schedules?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in process-recurring-maintenance:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

function calculateNextDate(
  lastDate: string | null,
  pattern: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null
): string {
  const base = lastDate ? new Date(lastDate) : new Date();
  const next = new Date(base);

  switch (pattern) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (dayOfMonth) {
        next.setDate(dayOfMonth);
      }
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }

  return next.toISOString().split('T')[0];
}
