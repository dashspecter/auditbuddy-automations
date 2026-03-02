import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Normalize role name for matching (mirrors SQL translate logic)
function normalizeRole(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/[ăâ]/g, "a")
    .replace(/[î]/g, "i")
    .replace(/[ș]/g, "s")
    .replace(/[ț]/g, "t")
    .replace(/\s+/g, " ");
}

// Check if a task matches employee role
function taskMatchesRole(
  task: any,
  empNormalizedRole: string,
  taskRolesMap: Map<string, string[]>,
  roleNamesMap: Map<string, string>
): boolean {
  const taskId = task.id;
  const directRoleId = task.assigned_role_id;
  const junctionRoleIds = taskRolesMap.get(taskId) || [];

  // No role restriction: task has no assigned_role_id AND no task_roles entries
  if (!directRoleId && junctionRoleIds.length === 0) return true;

  // Check direct role
  if (directRoleId) {
    const roleName = roleNamesMap.get(directRoleId);
    if (normalizeRole(roleName) === empNormalizedRole) return true;
  }

  // Check junction roles
  for (const roleId of junctionRoleIds) {
    const roleName = roleNamesMap.get(roleId);
    if (normalizeRole(roleName) === empNormalizedRole) return true;
  }

  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine target month (previous month by default, or from body)
    let targetMonth: string;
    try {
      const body = await req.json();
      targetMonth = body?.month; // yyyy-MM-dd
    } catch {
      // No body — use previous month
    }

    if (!targetMonth!) {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
    }

    // Parse month boundaries
    const monthDate = new Date(targetMonth);
    const startDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
    const endMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const endDate = `${endMonthDate.getFullYear()}-${String(endMonthDate.getMonth() + 1).padStart(2, "0")}-${String(endMonthDate.getDate()).padStart(2, "0")}`;

    console.log(`[snapshot-monthly-scores] Processing ${startDate} to ${endDate}`);

    // Get all active employees grouped by company
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, company_id, location_id, full_name, role")
      .eq("status", "active");

    if (empErr) throw empErr;

    // Also get employees with approved shifts in the period (for guest-shift fix)
    const { data: shiftAssignments } = await supabase
      .from("shift_assignments")
      .select("staff_id, shifts!inner(company_id, location_id, shift_date)")
      .eq("approval_status", "approved")
      .gte("shifts.shift_date", startDate)
      .lte("shifts.shift_date", endDate);

    // Build complete employee set (home + guest)
    const employeeMap = new Map<string, any>();
    for (const emp of employees || []) {
      employeeMap.set(emp.id, emp);
    }

    // Group by company
    const byCompany: Record<string, typeof employees> = {};
    for (const emp of employees || []) {
      if (!byCompany[emp.company_id]) byCompany[emp.company_id] = [];
      byCompany[emp.company_id].push(emp);
    }

    let totalUpserted = 0;

    for (const [companyId, companyEmployees] of Object.entries(byCompany)) {
      // Get shifts for this period
      const { data: shifts } = await supabase
        .from("shifts")
        .select("id, shift_date, location_id, shift_assignments!inner(staff_id, approval_status)")
        .eq("shift_assignments.approval_status", "approved")
        .gte("shift_date", startDate)
        .lte("shift_date", endDate);

      // Get attendance
      const { data: attendance } = await supabase
        .from("attendance_logs")
        .select("staff_id, shift_id, is_late, late_minutes")
        .gte("check_in_at", `${startDate}T00:00:00`)
        .lte("check_in_at", `${endDate}T23:59:59`);

      // Get tasks (both shared and individual)
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, assigned_to, status, completed_late, is_individual, assigned_role_id")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .not("assigned_to", "is", null);

      // Get shared/individual tasks (unassigned)
      const { data: sharedTasks } = await supabase
        .from("tasks")
        .select("id, assigned_to, status, completed_late, is_individual, assigned_role_id, location_id")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .is("assigned_to", null);

      // Get task completions
      const { data: completions } = await supabase
        .from("task_completions")
        .select("task_id, completed_by_employee_id, completed_late, occurrence_date")
        .gte("occurrence_date", startDate)
        .lte("occurrence_date", endDate)
        .not("completed_by_employee_id", "is", null);

      // Get employee_roles for role matching
      const { data: employeeRoles } = await supabase
        .from("employee_roles")
        .select("id, name");

      // Get task_roles junction for role matching
      const { data: taskRolesData } = await supabase
        .from("task_roles")
        .select("task_id, role_id");

      // Get test submissions
      const { data: tests } = await supabase
        .from("test_submissions")
        .select("employee_id, score, passed")
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`)
        .not("employee_id", "is", null);

      // Get reviews
      const { data: reviews } = await supabase
        .from("staff_audits")
        .select("employee_id, score")
        .gte("audit_date", startDate)
        .lte("audit_date", endDate)
        .not("employee_id", "is", null);

      // Get warnings (90 days back from end of target month)
      const warningStart = new Date(endMonthDate);
      warningStart.setDate(warningStart.getDate() - 90);
      const { data: warnings } = await supabase
        .from("staff_events")
        .select("staff_id, event_date, metadata")
        .eq("event_type", "warning")
        .gte("event_date", warningStart.toISOString().split("T")[0]);

      // Build role lookup maps
      const roleNamesMap = new Map<string, string>();
      for (const r of employeeRoles || []) {
        roleNamesMap.set(r.id, r.name);
      }
      const taskRolesMap = new Map<string, string[]>();
      for (const tr of taskRolesData || []) {
        if (!taskRolesMap.has(tr.task_id)) taskRolesMap.set(tr.task_id, []);
        taskRolesMap.get(tr.task_id)!.push(tr.role_id);
      }

      // Compute per-location scores for ranking
      const locationScores: Record<string, { empId: string; score: number }[]> = {};

      const rows: any[] = [];

      for (const emp of companyEmployees!) {
        const empNormalizedRole = normalizeRole(emp.role);
        // Attendance
        const empShifts = (shifts || []).filter((s: any) =>
          s.shift_assignments?.some((sa: any) => sa.staff_id === emp.id)
        );
        const pastShifts = empShifts.filter((s: any) => new Date(s.shift_date) <= endMonthDate);
        const scheduled = pastShifts.length;
        const worked = pastShifts.filter((s: any) =>
          (attendance || []).some((a: any) => a.staff_id === emp.id && a.shift_id === s.id)
        ).length;

        // Build set of dates employee had approved shifts
        const empShiftDates = new Set(empShifts.map((s: any) => s.shift_date));

        // Punctuality
        const empAttendance = (attendance || []).filter((a: any) => a.staff_id === emp.id);
        const lateCount = empAttendance.filter((a: any) => a.is_late).length;
        const lateMins = empAttendance.reduce((s: number, a: any) => s + (a.late_minutes || 0), 0);

        // Direct tasks
        const directTasks = (tasks || []).filter((t: any) => t.assigned_to === emp.id);
        const directAssigned = directTasks.length;
        const directCompleted = directTasks.filter((t: any) => t.status === "completed").length;
        const directOnTime = directTasks.filter((t: any) => t.status === "completed" && !t.completed_late).length;

        // Shared tasks (non-individual, unassigned)
        const directIds = new Set(directTasks.map((t: any) => t.id));
        const empCompletions = (completions || []).filter(
          (c: any) => c.completed_by_employee_id === emp.id && !directIds.has(c.task_id)
        );

        // Shared (non-individual) completions on shift days WITH role filter
        const sharedCompletions = empCompletions.filter((c: any) => {
          const task = (sharedTasks || []).find((t: any) => t.id === c.task_id);
          return task && !task.is_individual 
            && empShiftDates.has(c.occurrence_date)
            && taskMatchesRole(task, empNormalizedRole, taskRolesMap, roleNamesMap);
        });
        const sharedAssigned = sharedCompletions.length; // approximate: count occurrences employee participated in
        const sharedOnTime = sharedCompletions.filter((c: any) => c.completed_late !== true).length;

        // Individual task completions by this employee on shift days WITH role filter
        const individualCompletions = empCompletions.filter((c: any) => {
          const task = (sharedTasks || []).find((t: any) => t.id === c.task_id);
          return task && task.is_individual 
            && empShiftDates.has(c.occurrence_date)
            && taskMatchesRole(task, empNormalizedRole, taskRolesMap, roleNamesMap);
        });
        // For individual tasks, each occurrence is 1 assigned per employee
        // Count distinct task+occurrence_date combinations as assigned
        const individualOccurrences = new Set(
          individualCompletions.map((c: any) => `${c.task_id}:${c.occurrence_date}`)
        );
        // Also count individual tasks that exist at the location but weren't completed
        const individualTasksAtLocation = (sharedTasks || []).filter((t: any) => t.is_individual);
        // For simplicity, count assigned = completions attempted (same as shared logic)
        const individualAssigned = individualOccurrences.size;
        const individualCompleted = individualCompletions.length;
        const individualOnTime = individualCompletions.filter((c: any) => c.completed_late !== true).length;

        // Merged totals
        const assigned = directAssigned + sharedAssigned + individualAssigned;
        const onTime = directOnTime + sharedOnTime + individualOnTime;

        // FIX #1: Cap task score at 100
        const taskScore = assigned > 0 ? Math.min(100, (onTime / assigned) * 100) : null;
        const taskUsed = assigned > 0;

        // FIX #4: Effective scoring — only average components with real data
        const attendanceScore = scheduled > 0 ? (worked / scheduled) * 100 : null;
        const attendanceUsed = scheduled > 0;

        const punctualityScore = scheduled > 0 ? Math.max(0, 100 - Math.min(lateCount * 5, 100) - Math.min(Math.floor(lateMins / 10), 50)) : null;
        const punctualityUsed = scheduled > 0;

        // Tests
        const empTests = (tests || []).filter((t: any) => t.employee_id === emp.id);
        const testScore = empTests.length > 0
          ? empTests.reduce((s: number, t: any) => s + (t.score || 0), 0) / empTests.length
          : null;
        const testUsed = empTests.length > 0;

        // Reviews
        const empReviews = (reviews || []).filter((r: any) => r.employee_id === emp.id);
        const reviewScore = empReviews.length > 0
          ? empReviews.reduce((s: number, r: any) => s + (r.score || 0), 0) / empReviews.length
          : null;
        const reviewUsed = empReviews.length > 0;

        // Effective score: average only USED components
        const usedScores: number[] = [];
        if (attendanceUsed && attendanceScore !== null) usedScores.push(attendanceScore);
        if (punctualityUsed && punctualityScore !== null) usedScores.push(punctualityScore);
        if (taskUsed && taskScore !== null) usedScores.push(taskScore);
        if (testUsed && testScore !== null) usedScores.push(testScore);
        if (reviewUsed && reviewScore !== null) usedScores.push(reviewScore);

        // Warning penalty
        const empWarnings = (warnings || []).filter((w: any) => w.staff_id === emp.id);
        let warningPenalty = 0;
        for (const w of empWarnings) {
          const daysSince = Math.floor((endMonthDate.getTime() - new Date(w.event_date).getTime()) / 86400000);
          const decay = Math.max(0, 1 - daysSince / 90);
          const severity = (w.metadata as any)?.severity === "major" ? 10 : 5;
          warningPenalty += severity * decay;
        }

        let effectiveScore: number | null = null;
        if (usedScores.length > 0) {
          const avg = usedScores.reduce((a, b) => a + b, 0) / usedScores.length;
          effectiveScore = Math.max(0, Math.min(100, avg - warningPenalty));
        }

        // Track for ranking
        const locId = emp.location_id;
        if (locId && effectiveScore !== null) {
          if (!locationScores[locId]) locationScores[locId] = [];
          locationScores[locId].push({ empId: emp.id, score: effectiveScore });
        }

        rows.push({
          employee_id: emp.id,
          company_id: companyId,
          month: startDate,
          effective_score: effectiveScore,
          used_components: usedScores.length,
          attendance_score: attendanceScore,
          punctuality_score: punctualityScore,
          task_score: taskScore,
          test_score: testScore,
          review_score: reviewScore,
          warning_penalty: warningPenalty,
          rank_in_location: null, // set below
        });
      }

      // Assign ranks per location
      for (const [, empScores] of Object.entries(locationScores)) {
        empScores.sort((a, b) => b.score - a.score);
        empScores.forEach((es, idx) => {
          const row = rows.find((r) => r.employee_id === es.empId);
          if (row) row.rank_in_location = idx + 1;
        });
      }

      // Upsert
      if (rows.length > 0) {
        const { error: upsertErr } = await supabase
          .from("performance_monthly_scores")
          .upsert(rows, { onConflict: "employee_id,month" });

        if (upsertErr) {
          console.error(`[snapshot] Upsert error for company ${companyId}:`, upsertErr);
        } else {
          totalUpserted += rows.length;
        }
      }
    }

    console.log(`[snapshot-monthly-scores] Done. Upserted ${totalUpserted} rows.`);

    return new Response(
      JSON.stringify({ success: true, upserted: totalUpserted, month: targetMonth }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[snapshot-monthly-scores] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
