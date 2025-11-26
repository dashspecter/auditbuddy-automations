import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringSchedule {
  id: string;
  name: string;
  location_id: string;
  template_id: string;
  assigned_user_id: string;
  recurrence_pattern: 'daily' | 'weekly' | 'monthly';
  day_of_week: number | null;
  day_of_month: number | null;
  start_time: string;
  duration_hours: number;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  last_generated_date: string | null;
  locations: {
    name: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting recurring audit generation process...');

    // Get all active recurring schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('recurring_audit_schedules')
      .select(`
        *,
        locations(name)
      `)
      .eq('is_active', true);

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    if (!schedules || schedules.length === 0) {
      console.log('No active recurring schedules found');
      return new Response(
        JSON.stringify({ message: 'No active schedules', generated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${schedules.length} active schedules`);
    let generatedCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const schedule of schedules as RecurringSchedule[]) {
      try {
        console.log(`Processing schedule: ${schedule.name} (${schedule.id})`);

        // Check if schedule has ended
        if (schedule.end_date) {
          const endDate = new Date(schedule.end_date);
          if (today > endDate) {
            console.log(`Schedule ${schedule.name} has ended, skipping`);
            continue;
          }
        }

        // Calculate next occurrence date
        let nextDate: Date;
        
        console.log(`Start date: ${schedule.start_date}, Last generated: ${schedule.last_generated_date}`);
        console.log(`Today: ${today.toISOString()}`);
        
        // If this is the first generation, use start_date directly if it matches the pattern
        // Otherwise use the last generated date
        if (!schedule.last_generated_date) {
          // First generation - check if start_date matches the pattern
          const startDate = new Date(schedule.start_date);
          startDate.setHours(0, 0, 0, 0);
          
          if (schedule.recurrence_pattern === 'weekly' && startDate.getDay() !== schedule.day_of_week) {
            // Start date doesn't match the day of week, find next occurrence
            nextDate = new Date(startDate);
            while (nextDate.getDay() !== schedule.day_of_week) {
              nextDate.setDate(nextDate.getDate() + 1);
            }
          } else if (schedule.recurrence_pattern === 'monthly' && startDate.getDate() !== schedule.day_of_month) {
            // Start date doesn't match the day of month, find next occurrence
            nextDate = new Date(startDate);
            const targetDay = schedule.day_of_month || 1;
            if (nextDate.getDate() > targetDay) {
              // Move to next month
              nextDate.setMonth(nextDate.getMonth() + 1);
            }
            nextDate.setDate(Math.min(targetDay, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
          } else {
            // Start date matches the pattern (or it's daily), use it
            nextDate = startDate;
          }
        } else {
          // Not first generation - calculate based on last generated
          const lastGenerated = new Date(schedule.last_generated_date);
          lastGenerated.setHours(0, 0, 0, 0);
          
          // Make sure we don't generate duplicate dates
          if (lastGenerated >= today) {
            console.log(`Already generated for today or future, skipping`);
            continue;
          }

          // Calculate next date based on pattern
          switch (schedule.recurrence_pattern) {
            case 'daily':
              nextDate = new Date(lastGenerated);
              nextDate.setDate(nextDate.getDate() + 1);
              break;
            
            case 'weekly': {
              nextDate = new Date(lastGenerated);
              nextDate.setDate(nextDate.getDate() + 1);
              // Find next occurrence of the specified day of week
              while (nextDate.getDay() !== schedule.day_of_week) {
                nextDate.setDate(nextDate.getDate() + 1);
              }
              break;
            }
            
            case 'monthly': {
              nextDate = new Date(lastGenerated);
              nextDate.setMonth(nextDate.getMonth() + 1);
              // Set to specified day of month
              const dayOfMonth = schedule.day_of_month || 1;
              nextDate.setDate(1); // Start at first day
              nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()));
              break;
            }
            
            default:
              console.error(`Unknown recurrence pattern: ${schedule.recurrence_pattern}`);
              continue;
          }
        }
        
        console.log(`Calculated next date: ${nextDate.toISOString()}, day of week: ${nextDate.getDay()}`);
        console.log(`Target day of week: ${schedule.day_of_week}`);

        // For manual generation, allow creating audits up to 30 days in the future
        // For automated runs, only generate if date is today or in the past
        const maxFutureDate = new Date(today);
        maxFutureDate.setDate(maxFutureDate.getDate() + 30);
        
        if (nextDate > maxFutureDate) {
          console.log(`Next occurrence is too far in the future (${nextDate.toISOString()}), skipping`);
          continue;
        }

        // Calculate start and end datetime
        const [hours, minutes] = schedule.start_time.split(':').map(Number);
        const scheduledStart = new Date(nextDate);
        scheduledStart.setHours(hours, minutes, 0, 0);
        
        const scheduledEnd = new Date(scheduledStart);
        scheduledEnd.setHours(scheduledEnd.getHours() + schedule.duration_hours);

        // Check if audit already exists for this date
        const { data: existingAudit } = await supabase
          .from('location_audits')
          .select('id')
          .eq('location_id', schedule.location_id)
          .eq('assigned_user_id', schedule.assigned_user_id)
          .eq('audit_date', nextDate.toISOString().split('T')[0])
          .eq('status', 'scheduled')
          .maybeSingle();

        if (existingAudit) {
          console.log(`Audit already exists for ${nextDate.toISOString()}, skipping`);
          continue;
        }

        // Create the scheduled audit
        const { data: newAudit, error: insertError } = await supabase
          .from('location_audits')
          .insert({
            location_id: schedule.location_id,
            location: schedule.locations.name,
            template_id: schedule.template_id,
            user_id: schedule.assigned_user_id,
            assigned_user_id: schedule.assigned_user_id,
            scheduled_start: scheduledStart.toISOString(),
            scheduled_end: scheduledEnd.toISOString(),
            audit_date: nextDate.toISOString().split('T')[0],
            status: 'scheduled',
            notes: `Auto-generated from recurring schedule: ${schedule.name}`,
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error creating audit for schedule ${schedule.name}:`, insertError);
          continue;
        }

        console.log(`Created audit ${newAudit.id} for ${nextDate.toISOString()}`);

        // Update last_generated_date
        const { error: updateError } = await supabase
          .from('recurring_audit_schedules')
          .update({ last_generated_date: nextDate.toISOString().split('T')[0] })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`Error updating last_generated_date for schedule ${schedule.name}:`, updateError);
        }

        generatedCount++;
      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.name}:`, scheduleError);
      }
    }

    console.log(`Process complete. Generated ${generatedCount} audits`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${generatedCount} audits from ${schedules.length} schedules`,
        generated: generatedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-recurring-audits:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
