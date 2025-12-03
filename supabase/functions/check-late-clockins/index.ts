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
    
    // Get hour and minute for comparison
    const currentHour = now.getUTCHours()
    const currentMinute = now.getUTCMinutes()
    const currentTimeFormatted = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:00`
    
    console.log(`Today: ${today}, Current time (UTC): ${currentTimeFormatted}`)

    // Get all shifts for today
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

    if (shiftsError) {
      console.error('Error fetching shifts:', shiftsError)
      throw shiftsError
    }

    console.log(`Found ${shifts?.length || 0} shifts for today`)

    let alertsCreated = 0

    for (const shift of shifts || []) {
      // Check if shift has started
      const shiftStartParts = shift.start_time.split(':')
      const shiftStartHour = parseInt(shiftStartParts[0])
      const shiftStartMinute = parseInt(shiftStartParts[1])
      
      // Compare times
      const shiftStartMinutes = shiftStartHour * 60 + shiftStartMinute
      const currentMinutes = currentHour * 60 + currentMinute
      
      if (currentMinutes <= shiftStartMinutes) {
        console.log(`Shift ${shift.id} hasn't started yet (${shift.start_time})`)
        continue
      }
      
      const lateMinutes = currentMinutes - shiftStartMinutes
      console.log(`Shift ${shift.id} started ${lateMinutes} minutes ago`)

      for (const assignment of (shift as any).shift_assignments || []) {
        if (assignment.approval_status !== 'approved') continue
        
        const staffId = assignment.staff_id
        const employee = assignment.employees

        console.log(`Checking staff ${employee?.full_name || staffId}`)

        // Check if there's an attendance log for this shift/staff
        const { data: existingLog } = await supabase
          .from('attendance_logs')
          .select('id')
          .eq('staff_id', staffId)
          .eq('shift_id', shift.id)
          .maybeSingle()

        if (existingLog) {
          console.log(`Staff ${employee?.full_name} already clocked in`)
          continue
        }

        // No clock-in found - they are late
        if (lateMinutes >= 10) {
          // Check if alert already exists for this shift
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('source', 'late_clockin')
            .eq('source_reference_id', shift.id)
            .eq('resolved', false)
            .maybeSingle()

          if (existingAlert) {
            console.log(`Alert already exists for ${employee?.full_name}`)
            continue
          }

          console.log(`Creating late alert for ${employee?.full_name}, ${lateMinutes} min late`)
          
          const { error: alertError } = await supabase
            .from('alerts')
            .insert({
              company_id: shift.company_id,
              location_id: shift.location_id,
              title: 'Missing Clock-In',
              message: `${employee?.full_name || 'Employee'} has not clocked in for their ${shift.start_time.slice(0, 5)} shift at ${(shift as any).locations?.name || 'location'}. They are ${lateMinutes} minutes late.`,
              severity: 'warning',
              category: 'staff',
              source: 'late_clockin',
              source_reference_id: shift.id,
              metadata: {
                shift_id: shift.id,
                staff_id: staffId,
                employee_name: employee?.full_name,
                shift_start: shift.start_time,
                late_minutes: lateMinutes
              }
            })

          if (alertError) {
            console.error(`Error creating alert:`, alertError)
          } else {
            alertsCreated++
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
