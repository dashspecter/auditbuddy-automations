import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  target_roles: string[];
  created_by: string;
  recurrence_pattern: string;
  recurrence_enabled: boolean;
  next_scheduled_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing recurring notifications...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const now = new Date();
    
    // Fetch all recurring notifications that are due
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('recurrence_enabled', true)
      .eq('is_active', true)
      .lte('next_scheduled_at', now.toISOString())
      .returns<Notification[]>();

    if (fetchError) {
      console.error('Error fetching recurring notifications:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${notifications?.length || 0} notifications to process`);

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No recurring notifications to process', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    let processedCount = 0;

    for (const notification of notifications) {
      try {
        // Calculate next scheduled time based on recurrence pattern
        const nextScheduledAt = calculateNextScheduledTime(
          now,
          notification.recurrence_pattern
        );

        // Create a new notification instance
        const { error: createError } = await supabase
          .from('notifications')
          .insert({
            title: notification.title,
            message: notification.message,
            type: notification.type,
            target_roles: notification.target_roles,
            created_by: notification.created_by,
            is_active: true,
            recurrence_pattern: 'none',
            recurrence_enabled: false,
          });

        if (createError) {
          console.error(`Error creating notification instance for ${notification.id}:`, createError);
          continue;
        }

        // Update the original notification with new next_scheduled_at and last_sent_at
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            next_scheduled_at: nextScheduledAt.toISOString(),
            last_sent_at: now.toISOString(),
          })
          .eq('id', notification.id);

        if (updateError) {
          console.error(`Error updating notification ${notification.id}:`, updateError);
          continue;
        }

        processedCount++;
        console.log(`Successfully processed notification ${notification.id}`);
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error);
      }
    }

    console.log(`Processed ${processedCount} recurring notifications`);

    return new Response(
      JSON.stringify({
        message: 'Recurring notifications processed successfully',
        processed: processedCount,
        total: notifications.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in process-recurring-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function calculateNextScheduledTime(currentTime: Date, pattern: string): Date {
  const next = new Date(currentTime);

  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      // Default to daily if pattern is unknown
      next.setDate(next.getDate() + 1);
  }

  return next;
}
