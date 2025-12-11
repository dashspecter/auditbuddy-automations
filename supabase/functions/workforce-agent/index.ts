import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to get Supabase client
function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

// ============ WORKFORCE AGENT LOGIC ============

interface TimesheetSummary {
  employee_id: string;
  employee_name: string;
  total_hours: number;
  overtime_hours: number;
  regular_hours: number;
  days_worked: number;
  anomalies: string[];
}

interface SchedulingInsight {
  type: "understaffing" | "overstaffing" | "mismatch" | "pattern";
  severity: "high" | "medium" | "low";
  location_id: string;
  date: string;
  message: string;
  details: Record<string, any>;
}

interface AttendanceRisk {
  employee_id: string;
  employee_name: string;
  risk_type: string;
  severity: "high" | "medium" | "low";
  details: Record<string, any>;
}

// Prepare payroll batch
async function preparePayroll(companyId: string, periodStart: string, periodEnd: string) {
  const supabase = getSupabase();
  const summaries: TimesheetSummary[] = [];

  console.log(`[WorkforceAgent] Preparing payroll for ${periodStart} to ${periodEnd}`);

  // Get all employees
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, hourly_rate, overtime_rate, base_salary")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (!employees || employees.length === 0) {
    return { batch: null, message: "No active employees found" };
  }

  // Get attendance logs for the period
  const { data: attendanceLogs } = await supabase
    .from("attendance_logs")
    .select("*, employee:staff_id(id, full_name)")
    .gte("check_in_at", periodStart)
    .lte("check_in_at", periodEnd + "T23:59:59Z");

  // Process each employee
  for (const employee of employees) {
    const employeeLogs = attendanceLogs?.filter(
      (log) => log.staff_id === employee.id && log.check_out_at
    ) || [];

    let totalHours = 0;
    let overtimeHours = 0;
    const anomalies: string[] = [];
    const daysWorked = new Set<string>();

    for (const log of employeeLogs) {
      const checkIn = new Date(log.check_in_at);
      const checkOut = new Date(log.check_out_at);
      const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
      
      totalHours += hours;
      daysWorked.add(checkIn.toISOString().split("T")[0]);

      // Check for anomalies
      if (hours > 12) {
        anomalies.push(`Shift over 12 hours on ${checkIn.toISOString().split("T")[0]}`);
      }
      if (log.is_late) {
        anomalies.push(`Late arrival on ${checkIn.toISOString().split("T")[0]} (${log.late_minutes} min)`);
      }
      if (log.auto_clocked_out) {
        anomalies.push(`Auto clock-out on ${checkIn.toISOString().split("T")[0]}`);
      }
    }

    // Calculate overtime (assuming 8 hours/day standard)
    const regularHoursMax = daysWorked.size * 8;
    overtimeHours = Math.max(0, totalHours - regularHoursMax);
    const regularHours = totalHours - overtimeHours;

    summaries.push({
      employee_id: employee.id,
      employee_name: employee.full_name,
      total_hours: Math.round(totalHours * 100) / 100,
      overtime_hours: Math.round(overtimeHours * 100) / 100,
      regular_hours: Math.round(regularHours * 100) / 100,
      days_worked: daysWorked.size,
      anomalies,
    });

    // Create or update timesheet records
    for (const day of daysWorked) {
      const dayLogs = employeeLogs.filter(
        (l) => new Date(l.check_in_at).toISOString().split("T")[0] === day
      );
      
      const firstLog = dayLogs[0];
      const lastLog = dayLogs[dayLogs.length - 1];
      
      if (firstLog && lastLog) {
        await supabase
          .from("timesheets")
          .upsert({
            employee_id: employee.id,
            company_id: companyId,
            location_id: firstLog.location_id,
            date: day,
            shift_start: firstLog.check_in_at,
            shift_end: lastLog.check_out_at,
            hours_worked: dayLogs.reduce((sum, l) => {
              if (!l.check_out_at) return sum;
              return sum + (new Date(l.check_out_at).getTime() - new Date(l.check_in_at).getTime()) / (1000 * 60 * 60);
            }, 0),
            anomalies_json: anomalies.filter(a => a.includes(day)),
            status: "pending",
          }, {
            onConflict: "employee_id,date",
          });
      }
    }
  }

  // Calculate totals
  const totalRegularHours = summaries.reduce((sum, s) => sum + s.regular_hours, 0);
  const totalOvertimeHours = summaries.reduce((sum, s) => sum + s.overtime_hours, 0);
  const totalAnomalies = summaries.reduce((sum, s) => sum + s.anomalies.length, 0);

  // Create payroll batch
  const { data: batch, error } = await supabase
    .from("payroll_batches")
    .insert({
      company_id: companyId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "draft",
      summary_json: {
        employee_count: employees.length,
        total_regular_hours: Math.round(totalRegularHours * 100) / 100,
        total_overtime_hours: Math.round(totalOvertimeHours * 100) / 100,
        total_anomalies: totalAnomalies,
        employee_summaries: summaries,
      },
      created_by_agent: true,
    })
    .select()
    .single();

  if (error) {
    console.error("[WorkforceAgent] Error creating payroll batch:", error);
    throw error;
  }

  // Log the action
  await supabase.from("agent_logs").insert({
    company_id: companyId,
    agent_type: "workforce",
    event_type: "payroll_prepared",
    details_json: {
      batch_id: batch.id,
      period_start: periodStart,
      period_end: periodEnd,
      employee_count: employees.length,
      total_hours: totalRegularHours + totalOvertimeHours,
    },
  });

  // Store in memory
  await supabase.from("agent_memory").insert({
    company_id: companyId,
    agent_type: "workforce",
    memory_type: "observation",
    content_json: {
      type: "payroll_prepared",
      batch_id: batch.id,
      period: `${periodStart} to ${periodEnd}`,
      employee_count: employees.length,
      anomaly_count: totalAnomalies,
    },
  });

  return { batch, summaries, message: `Prepared payroll for ${employees.length} employees` };
}

// Analyze scheduling patterns
async function analyzeScheduling(companyId: string, locationId: string, startDate: string, endDate: string) {
  const supabase = getSupabase();
  const insights: SchedulingInsight[] = [];

  console.log(`[WorkforceAgent] Analyzing scheduling for location ${locationId}`);

  // Get shifts for the period
  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, assignments:shift_assignments(*)")
    .eq("company_id", companyId)
    .eq("location_id", locationId)
    .gte("shift_date", startDate)
    .lte("shift_date", endDate);

  // Get location operating hours
  const { data: operatingSchedule } = await supabase
    .from("location_operating_schedules")
    .select("*")
    .eq("location_id", locationId);

  // Analyze each shift
  if (shifts) {
    for (const shift of shifts) {
      const assignments = shift.assignments || [];
      const staffedCount = assignments.filter((a: any) => a.approval_status === "approved").length;

      // Check for understaffing
      if (staffedCount === 0) {
        insights.push({
          type: "understaffing",
          severity: "high",
          location_id: locationId,
          date: shift.shift_date,
          message: `No staff assigned for shift ${shift.start_time} - ${shift.end_time}`,
          details: { shift_id: shift.id, required: 1, assigned: 0 },
        });
      }

      // Check for pending assignments
      const pendingCount = assignments.filter((a: any) => a.approval_status === "pending").length;
      if (pendingCount > 0) {
        insights.push({
          type: "mismatch",
          severity: "medium",
          location_id: locationId,
          date: shift.shift_date,
          message: `${pendingCount} pending shift assignments need approval`,
          details: { shift_id: shift.id, pending: pendingCount },
        });
      }
    }
  }

  // Look for patterns in attendance
  const { data: attendanceLogs } = await supabase
    .from("attendance_logs")
    .select("*")
    .eq("location_id", locationId)
    .gte("check_in_at", startDate)
    .lte("check_in_at", endDate + "T23:59:59Z");

  if (attendanceLogs) {
    // Group by day of week
    const dayOfWeekStats: Record<number, { total: number; late: number }> = {};
    
    for (const log of attendanceLogs) {
      const dow = new Date(log.check_in_at).getDay();
      if (!dayOfWeekStats[dow]) {
        dayOfWeekStats[dow] = { total: 0, late: 0 };
      }
      dayOfWeekStats[dow].total++;
      if (log.is_late) dayOfWeekStats[dow].late++;
    }

    // Find days with high late rates
    for (const [dow, stats] of Object.entries(dayOfWeekStats)) {
      const lateRate = stats.total > 0 ? stats.late / stats.total : 0;
      if (lateRate > 0.3 && stats.total >= 3) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        insights.push({
          type: "pattern",
          severity: "medium",
          location_id: locationId,
          date: startDate,
          message: `High late rate on ${dayNames[parseInt(dow)]}s (${Math.round(lateRate * 100)}%)`,
          details: { day_of_week: dow, late_rate: lateRate, sample_size: stats.total },
        });
      }
    }
  }

  // Store patterns in memory
  if (insights.length > 0) {
    await supabase.from("agent_memory").insert({
      company_id: companyId,
      agent_type: "workforce",
      memory_type: "pattern",
      content_json: {
        type: "scheduling_analysis",
        location_id: locationId,
        period: `${startDate} to ${endDate}`,
        insights_count: insights.length,
        insights: insights.slice(0, 5), // Store top 5
        recommendation: insights.find(i => i.severity === "high")?.message || "Review scheduling patterns",
      },
    });
  }

  // Log the analysis
  await supabase.from("agent_logs").insert({
    company_id: companyId,
    agent_type: "workforce",
    event_type: "scheduling_analyzed",
    details_json: {
      location_id: locationId,
      period: `${startDate} to ${endDate}`,
      insights_count: insights.length,
      high_severity: insights.filter(i => i.severity === "high").length,
    },
  });

  return { insights, message: `Found ${insights.length} scheduling insights` };
}

// Detect attendance risks
async function detectAttendanceRisks(companyId: string, lookbackDays: number = 30) {
  const supabase = getSupabase();
  const risks: AttendanceRisk[] = [];
  const alerts: any[] = [];

  console.log(`[WorkforceAgent] Detecting attendance risks for past ${lookbackDays} days`);

  const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  // Get all employees
  const { data: employees } = await supabase
    .from("employees")
    .select("id, full_name, location_id")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (!employees) return { risks: [], alerts: [], message: "No employees found" };

  // Get attendance logs
  const { data: attendanceLogs } = await supabase
    .from("attendance_logs")
    .select("*")
    .gte("check_in_at", startDate);

  // Analyze each employee
  for (const employee of employees) {
    const employeeLogs = attendanceLogs?.filter(l => l.staff_id === employee.id) || [];
    
    // 1. Late pattern detection
    const lateLogs = employeeLogs.filter(l => l.is_late);
    const lateRate = employeeLogs.length > 0 ? lateLogs.length / employeeLogs.length : 0;
    
    if (lateRate > 0.3 && employeeLogs.length >= 5) {
      const risk: AttendanceRisk = {
        employee_id: employee.id,
        employee_name: employee.full_name,
        risk_type: "late_pattern",
        severity: lateRate > 0.5 ? "high" : "medium",
        details: {
          late_count: lateLogs.length,
          total_shifts: employeeLogs.length,
          late_rate: Math.round(lateRate * 100),
          avg_late_minutes: lateLogs.length > 0 
            ? Math.round(lateLogs.reduce((sum, l) => sum + (l.late_minutes || 0), 0) / lateLogs.length)
            : 0,
        },
      };
      risks.push(risk);

      // Create alert
      const { data: alert } = await supabase
        .from("attendance_alerts")
        .insert({
          company_id: companyId,
          location_id: employee.location_id,
          employee_id: employee.id,
          date: new Date().toISOString().split("T")[0],
          alert_type: "late_pattern",
          details_json: risk.details,
          status: "open",
        })
        .select()
        .single();
      
      if (alert) alerts.push(alert);
    }

    // 2. Excessive overtime detection
    const totalHours = employeeLogs.reduce((sum, l) => {
      if (!l.check_out_at) return sum;
      return sum + (new Date(l.check_out_at).getTime() - new Date(l.check_in_at).getTime()) / (1000 * 60 * 60);
    }, 0);
    
    const avgHoursPerShift = employeeLogs.length > 0 ? totalHours / employeeLogs.length : 0;
    
    if (avgHoursPerShift > 10 && employeeLogs.length >= 3) {
      const risk: AttendanceRisk = {
        employee_id: employee.id,
        employee_name: employee.full_name,
        risk_type: "excessive_overtime",
        severity: avgHoursPerShift > 12 ? "high" : "medium",
        details: {
          avg_hours_per_shift: Math.round(avgHoursPerShift * 10) / 10,
          total_hours: Math.round(totalHours),
          shift_count: employeeLogs.length,
        },
      };
      risks.push(risk);

      const { data: alert } = await supabase
        .from("attendance_alerts")
        .insert({
          company_id: companyId,
          location_id: employee.location_id,
          employee_id: employee.id,
          date: new Date().toISOString().split("T")[0],
          alert_type: "excessive_overtime",
          details_json: risk.details,
          status: "open",
        })
        .select()
        .single();
      
      if (alert) alerts.push(alert);
    }

    // 3. Auto clock-out detection (potential no-shows or forgot to clock out)
    const autoClockOuts = employeeLogs.filter(l => l.auto_clocked_out);
    if (autoClockOuts.length >= 2) {
      const risk: AttendanceRisk = {
        employee_id: employee.id,
        employee_name: employee.full_name,
        risk_type: "auto_clockout_pattern",
        severity: autoClockOuts.length >= 3 ? "high" : "medium",
        details: {
          auto_clockout_count: autoClockOuts.length,
          total_shifts: employeeLogs.length,
        },
      };
      risks.push(risk);

      const { data: alert } = await supabase
        .from("attendance_alerts")
        .insert({
          company_id: companyId,
          location_id: employee.location_id,
          employee_id: employee.id,
          date: new Date().toISOString().split("T")[0],
          alert_type: "auto_clockout_pattern",
          details_json: risk.details,
          status: "open",
        })
        .select()
        .single();
      
      if (alert) alerts.push(alert);
    }
  }

  // Log the analysis
  await supabase.from("agent_logs").insert({
    company_id: companyId,
    agent_type: "workforce",
    event_type: "attendance_risks_detected",
    details_json: {
      lookback_days: lookbackDays,
      employees_analyzed: employees.length,
      risks_found: risks.length,
      alerts_created: alerts.length,
    },
  });

  // Store patterns
  if (risks.length > 0) {
    await supabase.from("agent_memory").insert({
      company_id: companyId,
      agent_type: "workforce",
      memory_type: "observation",
      content_json: {
        type: "attendance_risks",
        lookback_days: lookbackDays,
        risks_count: risks.length,
        risk_types: [...new Set(risks.map(r => r.risk_type))],
        high_risk_employees: risks.filter(r => r.severity === "high").map(r => r.employee_name),
      },
    });
  }

  return { risks, alerts, message: `Found ${risks.length} attendance risks, created ${alerts.length} alerts` };
}

// ============ HTTP HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let path = url.pathname.replace("/workforce-agent", "");
    
    console.log("workforce-agent called with path:", path, "method:", req.method);
    
    // Parse body for action-based routing (when using supabase.functions.invoke)
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
        console.log("workforce-agent body action:", body.action);
        // Support action-based routing - check for empty path or just "/"
        if (body.action && (!path || path === "/")) {
          path = "/" + body.action;
          console.log("workforce-agent routing to path:", path);
        }
      } catch (e) {
        console.error("Error parsing body:", e);
        body = {};
      }
    }

    if (req.method === "POST" && path === "/prepare-payroll") {
      const { company_id, period_start, period_end } = body;
      
      if (!company_id || !period_start || !period_end) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: company_id, period_start, period_end" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await preparePayroll(company_id, period_start, period_end);
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/analyze-scheduling") {
      const { company_id, location_id, start_date, end_date } = body;
      
      if (!company_id || !location_id || !start_date || !end_date) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await analyzeScheduling(company_id, location_id, start_date, end_date);
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/detect-attendance-risks") {
      const { company_id, lookback_days = 30 } = body;
      
      if (!company_id) {
        return new Response(
          JSON.stringify({ error: "Missing required field: company_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await detectAttendanceRisks(company_id, lookback_days);
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/run") {
      const { company_id, location_id, goal, mode = "simulate" } = body;
      
      if (!company_id) {
        return new Response(
          JSON.stringify({ error: "Missing required field: company_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabase();
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Create task record
      const { data: task } = await supabase
        .from("agent_tasks")
        .insert({
          company_id,
          agent_type: "workforce",
          goal: goal || "Workforce analysis",
          input_json: { location_id, mode },
          status: "running",
        })
        .select()
        .single();

      if (mode === "simulate") {
        await supabase.from("agent_logs").insert({
          company_id,
          agent_type: "workforce",
          task_id: task?.id,
          event_type: "simulation",
          details_json: {
            would_execute: [
              "analyzeScheduling",
              "detectAttendanceRisks",
            ],
            location_id,
          },
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            mode: "simulate",
            task_id: task?.id,
            message: "Simulation complete - no changes made" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Execute full run
      let schedulingResult = null;
      if (location_id) {
        schedulingResult = await analyzeScheduling(company_id, location_id, thirtyDaysAgo, today);
      }
      const risksResult = await detectAttendanceRisks(company_id, 30);

      // Update task
      await supabase
        .from("agent_tasks")
        .update({
          status: "completed",
          result_json: {
            scheduling_analysis: schedulingResult,
            attendance_risks: risksResult,
          },
        })
        .eq("id", task?.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          mode,
          task_id: task?.id,
          data: {
            scheduling_analysis: schedulingResult,
            attendance_risks: risksResult,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found", path }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[WorkforceAgent] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
