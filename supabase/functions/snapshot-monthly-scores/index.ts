import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// HELPERS
// ============================================================

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

function taskMatchesRole(
  task: any,
  empNormalizedRole: string,
  taskRolesMap: Map<string, string[]>,
  roleNamesMap: Map<string, string>
): boolean {
  const taskId = task.id;
  const directRoleId = task.assigned_role_id;
  const junctionRoleIds = taskRolesMap.get(taskId) || [];
  if (!directRoleId && junctionRoleIds.length === 0) return true;
  if (directRoleId) {
    const roleName = roleNamesMap.get(directRoleId);
    if (normalizeRole(roleName) === empNormalizedRole) return true;
  }
  for (const roleId of junctionRoleIds) {
    const roleName = roleNamesMap.get(roleId);
    if (normalizeRole(roleName) === empNormalizedRole) return true;
  }
  return false;
}

/**
 * Check if a recurring task occurs on a specific date.
 * Mirrors the SQL task_occurs_on_date() function.
 */
function taskOccursOnDate(
  recurrenceType: string | null,
  taskCreatedAt: string,
  recurrenceInterval: number | null,
  recurrenceDaysOfWeek: number[] | null,
  recurrenceEndDate: string | null,
  targetDate: string // yyyy-MM-dd
): boolean {
  if (!recurrenceType || recurrenceType === "none" || recurrenceType === "") {
    return false;
  }

  // Parse dates in Europe/Bucharest conceptually (use UTC date math)
  const taskDate = new Date(taskCreatedAt);
  const taskDateStr = taskDate.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  const target = new Date(targetDate + "T12:00:00Z"); // noon UTC to avoid boundary issues
  const taskDay = new Date(taskDateStr + "T12:00:00Z");

  const interval = recurrenceInterval || 1;

  // Must not be before task creation (FIX: changed from <= to <)
  if (target < taskDay) return false;

  // Creation date always counts for recurring tasks
  if (target.getTime() === taskDay.getTime()) return true;

  // Check recurrence end
  if (recurrenceEndDate) {
    const endDate = new Date(recurrenceEndDate);
    const endDateStr = endDate.toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
    const endDay = new Date(endDateStr + "T12:00:00Z");
    if (target > endDay) return false;
  }

  const dayDiff = Math.round((target.getTime() - taskDay.getTime()) / 86400000);
  const targetDow = target.getUTCDay(); // 0=Sun, 6=Sat
  const taskDow = taskDay.getUTCDay();

  if (recurrenceType === "daily") {
    return dayDiff % interval === 0;
  }

  if (recurrenceType === "weekdays") {
    return targetDow >= 1 && targetDow <= 5;
  }

  if (recurrenceType === "weekly") {
    if (recurrenceDaysOfWeek && recurrenceDaysOfWeek.length > 0) {
      const maxVal = Math.max(...recurrenceDaysOfWeek);
      const normalized = maxVal > 6
        ? recurrenceDaysOfWeek.map(d => d === 7 ? 0 : d)
        : recurrenceDaysOfWeek;
      if (!normalized.includes(targetDow)) return false;
      const weekDiff = Math.floor(dayDiff / 7);
      return weekDiff % interval === 0;
    } else {
      if (targetDow !== taskDow) return false;
      const weekDiff = Math.floor(dayDiff / 7);
      return weekDiff % interval === 0;
    }
  }

  if (recurrenceType === "monthly") {
    return target.getUTCDate() === taskDay.getUTCDate();
  }

  return false;
}

/**
 * Parse a time string (HH:MM) to minutes since midnight.
 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Check if a shift time range covers a task time.
 */
function shiftCoversTime(shiftStart: string, shiftEnd: string, taskTime: string): boolean {
  const start = timeToMinutes(shiftStart);
  const end = timeToMinutes(shiftEnd);
  const task = timeToMinutes(taskTime);
  return start <= task && end >= task;
}

/**
 * Get time slots for a task on a given date.
 * Returns array of HH:MM strings, or [null] if no specific time.
 */
function getTaskTimeSlots(task: any): (string | null)[] {
  if (task.recurrence_times && task.recurrence_times.length > 0) {
    return task.recurrence_times;
  }
  if (task.start_at) {
    const d = new Date(task.start_at);
    const h = d.toLocaleString("en-GB", { timeZone: "Europe/Bucharest", hour: "2-digit", minute: "2-digit", hour12: false });
    return [h];
  }
  return [null];
}

// ============================================================
// MAIN
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Determine target month
    let targetMonth: string;
    try {
      const body = await req.json();
      targetMonth = body?.month;
    } catch {
      // No body
    }

    if (!targetMonth!) {
      const now = new Date();
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
    }

    const monthDate = new Date(targetMonth);
    const startDate = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}-01`;
    const endMonthDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const endDate = `${endMonthDate.getFullYear()}-${String(endMonthDate.getMonth() + 1).padStart(2, "0")}-${String(endMonthDate.getDate()).padStart(2, "0")}`;

    console.log(`[snapshot-monthly-scores] Processing ${startDate} to ${endDate}`);

    // Get all active employees
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, company_id, location_id, full_name, role")
      .eq("status", "active");
    if (empErr) throw empErr;

    // Group by company
    const byCompany: Record<string, typeof employees> = {};
    for (const emp of employees || []) {
      if (!byCompany[emp.company_id]) byCompany[emp.company_id] = [];
      byCompany[emp.company_id].push(emp);
    }

    let totalUpserted = 0;

    for (const [companyId, companyEmployees] of Object.entries(byCompany)) {
      // Get shifts with times for this period
      const { data: shifts } = await supabase
        .from("shifts")
        .select("id, shift_date, location_id, start_time, end_time, shift_assignments!inner(staff_id, approval_status)")
        .eq("shift_assignments.approval_status", "approved")
        .gte("shift_date", startDate)
        .lte("shift_date", endDate);

      // Get attendance
      const { data: attendance } = await supabase
        .from("attendance_logs")
        .select("staff_id, shift_id, is_late, late_minutes")
        .gte("check_in_at", `${startDate}T00:00:00`)
        .lte("check_in_at", `${endDate}T23:59:59`);

      // Get direct tasks
      const { data: directTasks } = await supabase
        .from("tasks")
        .select("id, assigned_to, status, completed_late, is_individual, assigned_role_id")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .not("assigned_to", "is", null);

      // Get shared/individual tasks (unassigned) WITH recurrence fields — scoped to company + paginated
      const allSharedTasks: any[] = [];
      let sharedOffset = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data: page } = await supabase
          .from("tasks")
          .select("id, assigned_to, status, completed_late, is_individual, assigned_role_id, location_id, recurrence_type, recurrence_interval, recurrence_days_of_week, recurrence_end_date, recurrence_times, start_at, created_at")
          .is("assigned_to", null)
          .eq("company_id", companyId)
          .range(sharedOffset, sharedOffset + PAGE_SIZE - 1);
        if (!page || page.length === 0) break;
        allSharedTasks.push(...page);
        if (page.length < PAGE_SIZE) break;
        sharedOffset += PAGE_SIZE;
      }
      const sharedTasks = allSharedTasks;

      // Get task_locations
      const { data: taskLocationsData } = await supabase
        .from("task_locations")
        .select("task_id, location_id");

      // Get task completions
      const { data: completions } = await supabase
        .from("task_completions")
        .select("task_id, completed_by_employee_id, completed_late, occurrence_date")
        .gte("occurrence_date", startDate)
        .lte("occurrence_date", endDate)
        .not("completed_by_employee_id", "is", null);

      // Get employee_roles
      const { data: employeeRoles } = await supabase
        .from("employee_roles")
        .select("id, name");

      // Get task_roles junction
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

      // Get warnings (90 days back)
      const warningStart = new Date(endMonthDate);
      warningStart.setDate(warningStart.getDate() - 90);
      const { data: warnings } = await supabase
        .from("staff_events")
        .select("staff_id, event_date, metadata")
        .eq("event_type", "warning")
        .gte("event_date", warningStart.toISOString().split("T")[0]);

      // Build lookup maps
      const roleNamesMap = new Map<string, string>();
      for (const r of employeeRoles || []) roleNamesMap.set(r.id, r.name);
      
      const taskRolesMap = new Map<string, string[]>();
      for (const tr of taskRolesData || []) {
        if (!taskRolesMap.has(tr.task_id)) taskRolesMap.set(tr.task_id, []);
        taskRolesMap.get(tr.task_id)!.push(tr.role_id);
      }

      const taskLocMap = new Map<string, string[]>();
      for (const tl of taskLocationsData || []) {
        if (!taskLocMap.has(tl.task_id)) taskLocMap.set(tl.task_id, []);
        taskLocMap.get(tl.task_id)!.push(tl.location_id);
      }

      // Build employee map for role lookups
      const empMap = new Map<string, any>();
      for (const emp of companyEmployees!) empMap.set(emp.id, emp);

      // Pre-compute: for each location+date, which employees are on shift (with times)
      // Structure: locationId -> date -> [{empId, shiftStart, shiftEnd}]
      const shiftCoverage = new Map<string, Map<string, { empId: string; start: string; end: string; empRole: string }[]>>();
      for (const s of shifts || []) {
        for (const sa of s.shift_assignments || []) {
          const emp = empMap.get(sa.staff_id);
          if (!emp) continue;
          const locKey = s.location_id;
          if (!shiftCoverage.has(locKey)) shiftCoverage.set(locKey, new Map());
          const dateMap = shiftCoverage.get(locKey)!;
          if (!dateMap.has(s.shift_date)) dateMap.set(s.shift_date, []);
          dateMap.get(s.shift_date)!.push({
            empId: sa.staff_id,
            start: s.start_time || "00:00",
            end: s.end_time || "23:59",
            empRole: normalizeRole(emp.role),
          });
        }
      }

      // Helper: check if task is at location
      function taskAtLocation(task: any, locationId: string): boolean {
        if (task.location_id === locationId) return true;
        const locs = taskLocMap.get(task.id);
        return locs ? locs.includes(locationId) : false;
      }

      // Helper: get eligible count for a task at location+date+time
      function getEligibleCount(
        task: any,
        locationId: string,
        shiftDate: string,
        taskTime: string | null,
        empNormalizedRole: string
      ): number {
        const dateMap = shiftCoverage.get(locationId);
        if (!dateMap) return 0;
        const empsOnShift = dateMap.get(shiftDate) || [];

        return empsOnShift.filter(e => {
          // Role match
          if (!taskMatchesRole(task, e.empRole, taskRolesMap, roleNamesMap)) return false;
          // Time match
          if (taskTime) {
            return shiftCoversTime(e.start, e.end, taskTime);
          }
          return true;
        }).length;
      }

      const locationScores: Record<string, { empId: string; score: number }[]> = {};
      const rows: any[] = [];

      for (const emp of companyEmployees!) {
        const empNormalizedRole = normalizeRole(emp.role);
        const empLocationId = emp.location_id;

        // Get all shifts for this employee
        const empShifts = (shifts || []).filter((s: any) =>
          s.shift_assignments?.some((sa: any) => sa.staff_id === emp.id)
        );
        const pastShifts = empShifts.filter((s: any) => new Date(s.shift_date) <= endMonthDate);
        const scheduled = pastShifts.length;
        const worked = pastShifts.filter((s: any) =>
          (attendance || []).some((a: any) => a.staff_id === emp.id && a.shift_id === s.id)
        ).length;

        // Punctuality
        const empAttendance = (attendance || []).filter((a: any) => a.staff_id === emp.id);
        const lateCount = empAttendance.filter((a: any) => a.is_late).length;
        const lateMins = empAttendance.reduce((s: number, a: any) => s + (a.late_minutes || 0), 0);

        // Direct tasks
        const empDirectTasks = (directTasks || []).filter((t: any) => t.assigned_to === emp.id);
        const directAssigned = empDirectTasks.length;
        const directCompleted = empDirectTasks.filter((t: any) => t.status === "completed").length;
        const directOnTime = empDirectTasks.filter((t: any) => t.status === "completed" && !t.completed_late).length;

        // Build shift days with times for this employee
        const empShiftDays: { date: string; locationId: string; start: string; end: string }[] = [];
        for (const s of empShifts) {
          if (new Date(s.shift_date) <= endMonthDate) {
            empShiftDays.push({
              date: s.shift_date,
              locationId: s.location_id,
              start: s.start_time || "00:00",
              end: s.end_time || "23:59",
            });
          }
        }

        // Dedupe shift days per location (use earliest start, latest end per date+location)
        const shiftDayMap = new Map<string, { date: string; locationId: string; start: string; end: string }>();
        for (const sd of empShiftDays) {
          const key = `${sd.locationId}:${sd.date}`;
          const existing = shiftDayMap.get(key);
          if (!existing) {
            shiftDayMap.set(key, { ...sd });
          } else {
            if (timeToMinutes(sd.start) < timeToMinutes(existing.start)) existing.start = sd.start;
            if (timeToMinutes(sd.end) > timeToMinutes(existing.end)) existing.end = sd.end;
          }
        }

        // ==================== SHARED TASKS (FAIR SHARE) ====================
        let fairShareTotal = 0;
        const sharedTasksList = (sharedTasks || []).filter((t: any) => !t.is_individual);

        for (const [, sd] of shiftDayMap) {
          for (const task of sharedTasksList) {
            if (!taskAtLocation(task, sd.locationId)) continue;
            if (!taskMatchesRole(task, empNormalizedRole, taskRolesMap, roleNamesMap)) continue;

            // Check if task occurs on this date
            let occurs = false;
            const taskCreatedDate = new Date(task.created_at).toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
            if (taskCreatedDate === sd.date) {
              occurs = true;
            } else if (task.recurrence_type && task.recurrence_type !== "none") {
              occurs = taskOccursOnDate(
                task.recurrence_type,
                task.created_at,
                task.recurrence_interval,
                task.recurrence_days_of_week,
                task.recurrence_end_date,
                sd.date
              );
            }

            if (!occurs) continue;

            const timeSlots = getTaskTimeSlots(task);
            for (const slot of timeSlots) {
              if (slot) {
                // Check if employee's shift covers this time
                if (!shiftCoversTime(sd.start, sd.end, slot)) continue;
                const eligible = getEligibleCount(task, sd.locationId, sd.date, slot, empNormalizedRole);
                if (eligible > 0) fairShareTotal += 1.0 / eligible;
              } else {
                // No time: split among all eligible
                const eligible = getEligibleCount(task, sd.locationId, sd.date, null, empNormalizedRole);
                if (eligible > 0) fairShareTotal += 1.0 / eligible;
              }
            }
          }
        }

        const sharedAssigned = Math.round(fairShareTotal);

        // Shared completions (actual by this employee)
        const directIds = new Set(empDirectTasks.map((t: any) => t.id));
        const empCompletions = (completions || []).filter(
          (c: any) => c.completed_by_employee_id === emp.id && !directIds.has(c.task_id)
        );
        const sharedCompletions = empCompletions.filter((c: any) => {
          const task = sharedTasksList.find((t: any) => t.id === c.task_id);
          return task && taskMatchesRole(task, empNormalizedRole, taskRolesMap, roleNamesMap);
        });
        const sharedOnTime = sharedCompletions.filter((c: any) => c.completed_late !== true).length;

        // ==================== INDIVIDUAL TASKS (FAIR SHARE) ====================
        let individualFairShare = 0;
        const individualTasksList = (sharedTasks || []).filter((t: any) => t.is_individual);

        for (const [, sd] of shiftDayMap) {
          for (const task of individualTasksList) {
            if (!taskAtLocation(task, sd.locationId)) continue;
            if (!taskMatchesRole(task, empNormalizedRole, taskRolesMap, roleNamesMap)) continue;

            let occurs = false;
            const taskCreatedDate = new Date(task.created_at).toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
            if (taskCreatedDate === sd.date) {
              occurs = true;
            } else if (task.recurrence_type && task.recurrence_type !== "none") {
              occurs = taskOccursOnDate(
                task.recurrence_type,
                task.created_at,
                task.recurrence_interval,
                task.recurrence_days_of_week,
                task.recurrence_end_date,
                sd.date
              );
            }

            if (!occurs) continue;

            const timeSlots = getTaskTimeSlots(task);
            for (const slot of timeSlots) {
              if (slot) {
                if (shiftCoversTime(sd.start, sd.end, slot)) {
                  individualFairShare += 1; // individual = 1 per employee
                }
              } else {
                individualFairShare += 1;
              }
            }
          }
        }

        const individualAssigned = individualFairShare;
        const individualCompletions = empCompletions.filter((c: any) => {
          const task = individualTasksList.find((t: any) => t.id === c.task_id);
          return task && taskMatchesRole(task, empNormalizedRole, taskRolesMap, roleNamesMap);
        });
        const individualCompleted = individualCompletions.length;
        const individualOnTime = individualCompletions.filter((c: any) => c.completed_late !== true).length;

        // Merged totals
        const assigned = directAssigned + sharedAssigned + individualAssigned;
        const onTime = directOnTime + sharedOnTime + individualOnTime;
        const taskScore = assigned > 0 ? Math.min(100, (onTime / assigned) * 100) : null;
        const taskUsed = assigned > 0;

        // Attendance & punctuality
        const attendanceScore = scheduled > 0 ? (worked / scheduled) * 100 : null;
        const attendanceUsed = scheduled > 0;
        const punctualityScore = worked > 0 ? Math.max(0, 100 - Math.min(lateCount * 5, 100) - Math.min(Math.floor(lateMins / 10), 50)) : null;
        const punctualityUsed = worked > 0;

        // Tests
        const empTests = (tests || []).filter((t: any) => t.employee_id === emp.id);
        const testScore = empTests.length > 0 ? empTests.reduce((s: number, t: any) => s + (t.score || 0), 0) / empTests.length : null;
        const testUsed = empTests.length > 0;

        // Reviews
        const empReviews = (reviews || []).filter((r: any) => r.employee_id === emp.id);
        const reviewScore = empReviews.length > 0 ? empReviews.reduce((s: number, r: any) => s + (r.score || 0), 0) / empReviews.length : null;
        const reviewUsed = empReviews.length > 0;

        // Effective score
        const usedScores: number[] = [];
        if (attendanceUsed && attendanceScore !== null) usedScores.push(attendanceScore);
        if (punctualityUsed && punctualityScore !== null) usedScores.push(punctualityScore);
        if (taskUsed && taskScore !== null) usedScores.push(taskScore);
        if (testUsed && testScore !== null) usedScores.push(testScore);
        if (reviewUsed && reviewScore !== null) usedScores.push(reviewScore);

        // Warnings
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
          rank_in_location: null,
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
