import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const tz = "Europe/Bucharest";
    const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now); // YYYY-MM-DD

    const results = { upcoming: 0, overdue: 0, errors: 0 };

    // ──────────────────────────────────────────
    // 1. UPCOMING — tasks starting within 30 min
    // ──────────────────────────────────────────
    const in30min = new Date(now.getTime() + 30 * 60_000).toISOString();

    const { data: upcomingTasks, error: upErr } = await db
      .from("tasks")
      .select("id, title, company_id, assigned_to, assigned_role_id, start_at, is_individual, recurrence_type, location:locations(id, name)")
      .neq("status", "completed")
      .eq("notify_whatsapp", true)
      .not("start_at", "is", null)
      .gte("start_at", now.toISOString())
      .lte("start_at", in30min);

    if (upErr) console.error("Upcoming query error:", upErr.message);

    for (const task of upcomingTasks || []) {
      const minutesUntil = Math.round((new Date(task.start_at!).getTime() - now.getTime()) / 60_000);
      const unlockTime = new Intl.DateTimeFormat("ro-RO", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(task.start_at!));

      const employees = await resolveEmployees(db, task);

      for (const empId of employees) {
        const idempotencyPrefix = `task_upcoming:${task.id}:${todayLocal}`;
        try {
          await sendWhatsApp(supabaseUrl, serviceRoleKey, {
            company_id: task.company_id,
            employee_id: empId,
            template_name: "task_upcoming",
            variables: {
              task_title: task.title,
              minutes: String(minutesUntil),
              unlock_time: unlockTime,
            },
            event_type: "task_upcoming",
            event_ref_id: `${task.id}:${todayLocal}`,
          });
          results.upcoming++;
        } catch (e) {
          console.warn(`Upcoming notify failed for ${empId}:`, e);
          results.errors++;
        }
      }
    }

    // ──────────────────────────────────────────
    // 2. OVERDUE — tasks past deadline, not completed
    // ──────────────────────────────────────────
    // Fetch pending/in_progress tasks that have a deadline in the past
    const { data: overdueCandidates, error: odErr } = await db
      .from("tasks")
      .select("id, title, company_id, assigned_to, assigned_role_id, start_at, duration_minutes, due_at, is_individual, recurrence_type, location:locations(id, name)")
      .in("status", ["pending", "in_progress"])
      .eq("notify_whatsapp", true)
      .or(`due_at.lt.${now.toISOString()},start_at.lt.${now.toISOString()}`);

    if (odErr) console.error("Overdue query error:", odErr.message);

    for (const task of overdueCandidates || []) {
      // Calculate actual deadline
      let deadline: Date | null = null;
      if (task.start_at && task.duration_minutes) {
        deadline = new Date(new Date(task.start_at).getTime() + task.duration_minutes * 60_000);
      } else if (task.due_at) {
        deadline = new Date(task.due_at);
      }

      if (!deadline || deadline > now) continue; // not actually overdue

      // For recurring tasks, check if this occurrence is already completed
      const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
      if (isRecurring) {
        const { count } = await db
          .from("task_completions")
          .select("id", { count: "exact", head: true })
          .eq("task_id", task.id)
          .eq("occurrence_date", todayLocal);
        if ((count || 0) > 0) continue; // already completed for today
      }

      const dueInfo = deadline.toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });
      const employees = await resolveEmployees(db, task);

      for (const empId of employees) {
        try {
          await sendWhatsApp(supabaseUrl, serviceRoleKey, {
            company_id: task.company_id,
            employee_id: empId,
            template_name: "task_overdue",
            variables: {
              task_title: task.title,
              due_info: dueInfo,
            },
            event_type: "task_overdue",
            event_ref_id: `${task.id}:${todayLocal}`,
          });
          results.overdue++;
        } catch (e) {
          console.warn(`Overdue notify failed for ${empId}:`, e);
          results.errors++;
        }
      }
    }

    console.log("check-task-notifications results:", results);
    return new Response(JSON.stringify({ success: true, ...results }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("check-task-notifications error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

async function resolveEmployees(
  db: ReturnType<typeof createClient>,
  task: { assigned_to: string | null; assigned_role_id: string | null; company_id: string }
): Promise<string[]> {
  if (task.assigned_to) return [task.assigned_to];

  if (task.assigned_role_id) {
    // Get role name
    const { data: role } = await db
      .from("employee_roles")
      .select("name")
      .eq("id", task.assigned_role_id)
      .single();

    if (!role) return [];

    // Find employees with matching role
    const { data: employees } = await db
      .from("employees")
      .select("id")
      .eq("company_id", task.company_id)
      .ilike("role", role.name);

    return (employees || []).map((e) => e.id);
  }

  return [];
}

async function sendWhatsApp(
  supabaseUrl: string,
  serviceRoleKey: string,
  body: Record<string, unknown>
) {
  const res = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`send-whatsapp ${res.status}: ${text}`);
  }

  return res.json();
}
