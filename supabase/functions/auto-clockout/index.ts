import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Convert a local date+time string in a given IANA timezone to a UTC Date.
 */
function localToUtc(dateStr: string, timeStr: string, tz: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}Z`)
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
  const offsetMs = localAtUtc.getTime() - naiveUtc.getTime()
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

  // Check cron secret — header takes priority; fall back to body for manual triggers.
  // IMPORTANT: check for presence separately from correctness so undefined !== validSecret
  // never accidentally passes when CRON_SECRET env var is also undefined.
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (!expectedSecret) {
    console.error('CRON_SECRET env var not set')
    return new Response(
      JSON.stringify({ success: false, error: 'Server misconfiguration' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let cronSecret: string | undefined = req.headers.get('x-cron-secret') ?? undefined;
  if (!cronSecret) {
    try {
      const body = await req.clone().json()
      cronSecret = typeof body.cron_secret === 'string' ? body.cron_secret : undefined;
    } catch { /* No body */ }
  }

  if (!cronSecret || cronSecret !== expectedSecret) {
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

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, auto_clockout_delay_minutes')
    
    if (companiesError) {
      console.error('Error fetching companies:', companiesError)
      throw companiesError
    }

    let totalAutoClocked = 0
    let totalAlerts = 0

    for (const company of companies || []) {
      const delayMinutes = company.auto_clockout_delay_minutes || 30

      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          id,
          staff_id,
          shift_id,
          check_in_at,
          shifts!inner(
            shift_date,
            start_time,
            end_time,
            company_id,
            location_id
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

        const shiftEndUtc = localToUtc(shift.shift_date, shift.end_time, 'Europe/Bucharest')
        const autoClockoutTime = new Date(shiftEndUtc.getTime() + delayMinutes * 60 * 1000)
        const now = new Date()

        if (now > autoClockoutTime) {
          const clockOutTime = autoClockoutTime.toISOString()

          // Calculate hours_short: scheduled - actual
          const shiftStartUtc = localToUtc(shift.shift_date, shift.start_time, 'Europe/Bucharest')
          let scheduledMs = shiftEndUtc.getTime() - shiftStartUtc.getTime()
          if (scheduledMs <= 0) scheduledMs += 86400000 // overnight shift
          const scheduledHours = scheduledMs / 3600000

          const checkInTime = new Date(log.check_in_at)
          const actualHours = (autoClockoutTime.getTime() - checkInTime.getTime()) / 3600000
          const hoursShort = Math.max(0, Math.round((scheduledHours - actualHours) * 10) / 10)

          const { error: updateError } = await supabase
            .from('attendance_logs')
            .update({ 
              check_out_at: clockOutTime,
              auto_clocked_out: true,
              hours_short: hoursShort > 0 ? hoursShort : null,
              notes: `Auto clocked out ${delayMinutes} minutes after shift end`
            })
            .eq('id', log.id)

          if (updateError) {
            console.error(`Error auto clocking out log ${log.id}:`, updateError)
          } else {
            console.log(`Auto clocked out attendance log ${log.id}`)
            totalAutoClocked++

            // Fetch employee name for alert message
            const { data: empData } = await supabase
              .from('employees')
              .select('full_name')
              .eq('id', log.staff_id)
              .single()

            const { data: locData } = await supabase
              .from('locations')
              .select('name')
              .eq('id', shift.location_id)
              .single()

            const empName = empData?.full_name || 'Unknown employee'
            const locName = locData?.name || 'Unknown location'

            // Create "missing checkout" alert
            const { error: alertError } = await supabase
              .from('alerts')
              .insert({
                company_id: company.id,
                location_id: shift.location_id,
                severity: 'warning',
                category: 'attendance',
                source: 'missing_checkout',
                title: `Shift without check-out — to be verified`,
                message: `${empName} did not check out for their shift at ${locName} on ${shift.shift_date}. Auto clocked out after ${delayMinutes} min delay.`,
                resolved: false,
              })

            if (alertError) {
              console.error(`Error creating alert for log ${log.id}:`, alertError)
            } else {
              totalAlerts++
            }
          }
        }
      }
    }

    console.log(`Auto clock-out complete. ${totalAutoClocked} logs updated, ${totalAlerts} alerts created.`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto clocked out ${totalAutoClocked} attendance logs, created ${totalAlerts} alerts` 
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
