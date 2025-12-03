import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Checking for late/missing clock-ins...')

    const today = new Date().toISOString().split('T')[0]
    const now = new Date()
    const currentTime = now.toTimeString().split(' ')[0]

    // Get all shifts for today that have started but no clock-in yet
    const { data: shifts, error: shiftsError } = await supabase
      .from('shifts')
      .select(`
        id,
        shift_date,
        start_time,
        end_time,
        role,
        location_id,
        company_id,
        locations(name),
        shift_assignments(
          id,
          staff_id,
          approval_status,
          employees(id, full_name, user_id)
        )
      `)
      .eq('shift_date', today)
      .lte('start_time', currentTime)

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError)
      throw shiftsError
    }

    let alertsCreated = 0

    for (const shift of shifts || []) {
      for (const assignment of (shift as any).shift_assignments || []) {
        if (assignment.approval_status !== 'approved') continue
        
        const staffId = assignment.staff_id
        const employee = assignment.employees

        // Check if there's an attendance log for this shift/staff
        const { data: existingLog } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('staff_id', staffId)
          .eq('shift_id', shift.id)
          .maybeSingle()

        if (!existingLog) {
          // No clock-in found - calculate how late they are
          const shiftStart = new Date(`${shift.shift_date}T${shift.start_time}`)
          const lateMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000)

          // Create alert for manager if more than 10 minutes late
          if (lateMinutes >= 10) {
            // Check if alert already exists
            const { data: existingAlert } = await supabase
              .from('alerts')
              .select('id')
              .eq('source', 'late_clockin')
              .eq('source_reference_id', `${shift.id}_${staffId}`)
              .eq('resolved', false)
              .maybeSingle()

            if (!existingAlert) {
              const { error: alertError } = await supabase
                .from('alerts')
                .insert({
                  company_id: shift.company_id,
                  location_id: shift.location_id,
                  title: 'Missing Clock-In',
                  message: `${employee?.full_name || 'Employee'} has not clocked in for their ${shift.start_time.slice(0, 5)} shift at ${(shift as any).locations?.name || 'location'}. They are ${lateMinutes} minutes late.`,
                  severity: lateMinutes > 30 ? 'error' : 'warning',
                  category: 'staff',
                  source: 'late_clockin',
                  source_reference_id: `${shift.id}_${staffId}`,
                  metadata: {
                    shift_id: shift.id,
                    staff_id: staffId,
                    employee_name: employee?.full_name,
                    shift_start: shift.start_time,
                    late_minutes: lateMinutes
                  }
                })

              if (!alertError) {
                alertsCreated++
                console.log(`Created late alert for ${employee?.full_name}, ${lateMinutes} min late`)
              }
            }
          }
        }
      }
    }

    console.log(`Late clock-in check complete. ${alertsCreated} alerts created.`)

    return new Response(
      JSON.stringify({ success: true, alertsCreated }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Late clock-in check error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
