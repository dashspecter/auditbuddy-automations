import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Convert a local date+time string in a given IANA timezone to a UTC Date.
 * e.g. localToUtc('2026-02-24', '18:00:00', 'Europe/Bucharest')
 */
function localToUtc(dateStr: string, timeStr: string, tz: string): Date {
  // Build a date in UTC, then figure out the offset for that timezone
  const naiveUtc = new Date(`${dateStr}T${timeStr}Z`)
  // Get what that UTC instant looks like in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(naiveUtc).map(p => [p.type, p.value])
  )
  const localAtUtc = new Date(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`)
  // The offset is the difference between what UTC shows and what local shows
  const offsetMs = localAtUtc.getTime() - naiveUtc.getTime()
  // Subtract offset to get the true UTC time
  return new Date(naiveUtc.getTime() - offsetMs)
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate cron secret to prevent unauthorized access
  // Check header first, then body for flexibility
  let cronSecret = req.headers.get('x-cron-secret')
  
  if (!cronSecret) {
    try {
      const body = await req.clone().json()
      cronSecret = body.cron_secret
    } catch {
      // No body or invalid JSON
    }
  }
  
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    console.error('Unauthorized: Invalid or missing cron secret')
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting auto clock-out check...')

    // Get all companies with their auto_clockout_delay_minutes
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, auto_clockout_delay_minutes')
    
    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      throw companiesError
    }

    let totalAutoClocked = 0

    for (const company of companies || []) {
      const delayMinutes = company.auto_clockout_delay_minutes || 30
      
      // Find attendance logs where:
      // 1. check_out_at is null (not clocked out)
      // 2. The shift has ended + delay minutes ago
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          id,
          staff_id,
          shift_id,
          check_in_at,
          shifts!inner(
            shift_date,
            end_time,
            company_id
          )
        `)
        .is('check_out_at', null)
        .eq('shifts.company_id', company.id)

      if (logsError) {
        console.error(`Error fetching logs for company ${company.id}:`, logsError)
        continue
      }

      for (const log of logs || []) {
        const shift = (log as any).shifts
        if (!shift) continue

        // Convert shift end time from Europe/Bucharest local to UTC
        const shiftEndUtc = localToUtc(shift.shift_date, shift.end_time, 'Europe/Bucharest')
        const autoClockoutTime = new Date(shiftEndUtc.getTime() + delayMinutes * 60 * 1000)
        const now = new Date()

        if (now > autoClockoutTime) {
          // Auto clock out at shift end time + delay
          const clockOutTime = autoClockoutTime.toISOString()
          
          const { error: updateError } = await supabase
            .from('attendance_logs')
            .update({ 
              check_out_at: clockOutTime,
              auto_clocked_out: true,
              notes: `Auto clocked out ${delayMinutes} minutes after shift end`
            })
            .eq('id', log.id)

          if (updateError) {
            console.error(`Error auto clocking out log ${log.id}:`, updateError)
          } else {
            console.log(`Auto clocked out attendance log ${log.id}`)
            totalAutoClocked++
          }
        }
      }
    }

    console.log(`Auto clock-out complete. ${totalAutoClocked} logs updated.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto clocked out ${totalAutoClocked} attendance logs` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Auto clock-out error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
