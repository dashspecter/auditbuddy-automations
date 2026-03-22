import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_TIMEZONE = "Europe/Bucharest";
const MAX_TOOL_ROWS = 200;

// ─── Module Gating Map ─────────────────────────────────────
const TOOL_MODULE_MAP: Record<string, string> = {
  get_audit_results: "audits",
  compare_location_performance: "audits",
  get_open_corrective_actions: "corrective_actions",
  get_task_completion_summary: "tasks",
  get_attendance_exceptions: "workforce",
  get_work_order_status: "cmms",
  get_document_expiries: "documents",
  get_training_gaps: "workforce",
  search_employees: "workforce",
};

// ─── Helpers ────────────────────────────────────────────────
function cap<T>(data: T[] | null, limit = MAX_TOOL_ROWS) {
  const items = data ?? [];
  const total = items.length;
  return { items: items.slice(0, limit), total, returned: Math.min(total, limit), truncated: total > limit };
}

async function utcRange(sb: any, from: string, to: string, tz = DEFAULT_TIMEZONE) {
  const { data, error } = await sb.rpc("tz_date_range_to_utc", { from_date: from, to_date: to, tz });
  if (error || !data?.[0]) return null;
  return { fromUtc: data[0].from_utc, toUtc: data[0].to_utc };
}

// ─── Structured Event Helpers ───────────────────────────────
function makeStructuredEvent(type: string, data: any): string {
  return JSON.stringify({ type: "structured_event", event_type: type, data });
}

// ─── Tool Definitions ───────────────────────────────────────
const tools = [
  // --- READ: Cross-module ---
  {
    type: "function",
    function: {
      name: "get_location_overview",
      description: "Get a high-level overview of a location: employee count, recent audit score, open CAs, pending tasks. Requires location name or ID.",
      parameters: {
        type: "object",
        properties: {
          location_name: { type: "string", description: "Location name (partial match)" },
          location_id: { type: "string", description: "Location UUID (if known)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_cross_module_summary",
      description: "Get a cross-module operational summary for a location or all locations over a date range. Covers: audits, tasks, attendance, CAs, work orders.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location UUID filter" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Employees ---
  {
    type: "function",
    function: {
      name: "search_employees",
      description: "Search employees by name, phone, or email.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text" },
          limit: { type: "number", description: "Max results (default 10)" },
        },
        required: ["query"],
      },
    },
  },
  // --- READ: Audits ---
  {
    type: "function",
    function: {
      name: "get_audit_results",
      description: "Get recent audit results (scores, templates used, locations) within a date range.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string", description: "Optional location filter" },
          template_id: { type: "string", description: "Optional template filter" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 20)" },
        },
        required: ["from", "to"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_location_performance",
      description: "Compare audit performance across locations for a date range.",
      parameters: {
        type: "object",
        properties: {
          location_ids: { type: "array", items: { type: "string" }, description: "Location UUIDs to compare" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["location_ids", "from", "to"],
      },
    },
  },
  // --- READ: Corrective Actions ---
  {
    type: "function",
    function: {
      name: "get_open_corrective_actions",
      description: "List open/in-progress corrective actions, optionally filtered by location or severity.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  // --- READ: Tasks ---
  {
    type: "function",
    function: {
      name: "get_task_completion_summary",
      description: "Get task completion rates for a date range, optionally by location.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Attendance ---
  {
    type: "function",
    function: {
      name: "get_attendance_exceptions",
      description: "Get attendance exceptions (late arrivals, missed checkouts, no-shows) for a date range.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          from: { type: "string", description: "Start date YYYY-MM-DD" },
          to: { type: "string", description: "End date YYYY-MM-DD" },
          limit: { type: "number", description: "Max results (default 50)" },
        },
        required: ["from", "to"],
      },
    },
  },
  // --- READ: Work Orders ---
  {
    type: "function",
    function: {
      name: "get_work_order_status",
      description: "Get work order summary (open, in progress, completed) optionally by location.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
          status: { type: "string", enum: ["open", "in_progress", "completed", "cancelled"] },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
  },
  // --- READ: Documents ---
  {
    type: "function",
    function: {
      name: "get_document_expiries",
      description: "Get documents expiring soon or already expired.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: { type: "number", description: "Look-ahead days (default 30)" },
        },
      },
    },
  },
  // --- READ: Training ---
  {
    type: "function",
    function: {
      name: "get_training_gaps",
      description: "Identify employees with incomplete or overdue training assignments.",
      parameters: {
        type: "object",
        properties: {
          location_id: { type: "string" },
        },
      },
    },
  },
  // --- SEARCH: Locations ---
  {
    type: "function",
    function: {
      name: "search_locations",
      description: "Search locations by name.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search text for location name" },
        },
        required: ["query"],
      },
    },
  },
];

// ─── Tool Execution ─────────────────────────────────────────
async function executeTool(sb: any, name: string, args: any, companyId: string, role: string, activeModules: string[]): Promise<any> {
  // Module gating check
  const requiredModule = TOOL_MODULE_MAP[name];
  if (requiredModule && !activeModules.includes(requiredModule)) {
    return { error: `The "${requiredModule}" module is not active for your company. Please enable it in Billing & Modules.` };
  }

  switch (name) {
    case "search_locations": {
      const { data, error } = await sb.from("locations").select("id, name, address").ilike("name", `%${args.query}%`).limit(10);
      if (error) return { error: error.message };
      return { locations: data };
    }

    case "search_employees": {
      const limit = Math.min(args.limit || 10, MAX_TOOL_ROWS);
      const term = `%${args.query}%`;
      const { data, error } = await sb.from("employees").select("id, full_name, role, status, location_id, locations(name)")
        .or(`full_name.ilike.${term},phone.ilike.${term},email.ilike.${term}`).limit(limit);
      if (error) return { error: error.message };
      return { count: data?.length ?? 0, employees: data?.map((e: any) => ({ id: e.id, name: e.full_name, role: e.role, status: e.status, location: e.locations?.name })) };
    }

    case "get_location_overview": {
      let locationId = args.location_id;
      let locationName = args.location_name;
      if (!locationId && locationName) {
        const { data } = await sb.from("locations").select("id, name").ilike("name", `%${locationName}%`).limit(1);
        if (data?.[0]) { locationId = data[0].id; locationName = data[0].name; }
        else return { error: `No location found matching "${locationName}"` };
      }
      if (!locationId) return { error: "Please provide a location name or ID" };

      const [empRes, auditRes, caRes, taskRes] = await Promise.all([
        sb.from("employees").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "active"),
        sb.from("location_audits").select("overall_score").eq("location_id", locationId).eq("status", "completed").order("completed_at", { ascending: false }).limit(1),
        sb.from("corrective_actions").select("id", { count: "exact", head: true }).eq("location_id", locationId).in("status", ["open", "in_progress"]),
        sb.from("tasks").select("id", { count: "exact", head: true }).eq("location_id", locationId),
      ]);
      return {
        location: { id: locationId, name: locationName },
        employees_active: empRes.count ?? 0,
        latest_audit_score: auditRes.data?.[0]?.overall_score ?? null,
        open_corrective_actions: caRes.count ?? 0,
        total_tasks: taskRes.count ?? 0,
      };
    }

    case "get_cross_module_summary": {
      const ur = await utcRange(sb, args.from, args.to);
      const locationFilter = args.location_id;

      let auditQ = sb.from("location_audits").select("id, overall_score, status, location_id, locations(name)").gte("created_at", ur?.fromUtc ?? args.from).lt("created_at", ur?.toUtc ?? args.to);
      if (locationFilter) auditQ = auditQ.eq("location_id", locationFilter);
      const { data: audits } = await auditQ.limit(200);

      const completedAudits = (audits ?? []).filter((a: any) => a.status === "completed");
      const avgScore = completedAudits.length > 0 ? Math.round(completedAudits.reduce((s: number, a: any) => s + (a.overall_score ?? 0), 0) / completedAudits.length) : null;

      let caQ = sb.from("corrective_actions").select("id, severity, status, location_id").in("status", ["open", "in_progress"]);
      if (locationFilter) caQ = caQ.eq("location_id", locationFilter);
      const { data: cas } = await caQ.limit(200);

      let attQ = sb.from("attendance_logs").select("id, is_late, late_minutes, auto_clocked_out, check_out_at");
      if (ur) attQ = attQ.gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc);
      if (locationFilter) attQ = attQ.eq("location_id", locationFilter);
      const { data: attLogs } = await attQ.limit(1000);

      const lateCount = (attLogs ?? []).filter((l: any) => l.is_late).length;
      const noCheckout = (attLogs ?? []).filter((l: any) => !l.check_out_at && !l.auto_clocked_out).length;

      let woQ = sb.from("cmms_work_orders").select("id, status, priority");
      if (locationFilter) woQ = woQ.eq("location_id", locationFilter);
      const { data: wos } = await woQ.in("status", ["open", "in_progress"]).limit(200);

      return {
        date_range: { from: args.from, to: args.to },
        location_id: locationFilter ?? "all",
        audits: { total: (audits ?? []).length, completed: completedAudits.length, avg_score: avgScore },
        corrective_actions: { open: (cas ?? []).filter((c: any) => c.status === "open").length, in_progress: (cas ?? []).filter((c: any) => c.status === "in_progress").length, by_severity: { critical: (cas ?? []).filter((c: any) => c.severity === "critical").length, high: (cas ?? []).filter((c: any) => c.severity === "high").length } },
        attendance: { total_logs: (attLogs ?? []).length, late_arrivals: lateCount, missing_checkouts: noCheckout },
        work_orders: { open: (wos ?? []).filter((w: any) => w.status === "open").length, in_progress: (wos ?? []).filter((w: any) => w.status === "in_progress").length },
      };
    }

    case "get_audit_results": {
      const limit = Math.min(args.limit || 20, MAX_TOOL_ROWS);
      let q = sb.from("location_audits").select("id, overall_score, status, created_at, completed_at, location_id, locations(name), template_id, audit_templates(name)")
        .eq("status", "completed").gte("created_at", args.from).lte("created_at", args.to + "T23:59:59Z").order("completed_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.template_id) q = q.eq("template_id", args.template_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, audits: c.items.map((a: any) => ({ id: a.id, score: a.overall_score, location: a.locations?.name, template: a.audit_templates?.name, completed_at: a.completed_at })) };
    }

    case "compare_location_performance": {
      const results: any[] = [];
      for (const locId of args.location_ids ?? []) {
        const { data } = await sb.from("location_audits").select("overall_score, locations(name)").eq("location_id", locId).eq("status", "completed").gte("created_at", args.from).lte("created_at", args.to + "T23:59:59Z");
        const scores = (data ?? []).map((a: any) => a.overall_score).filter((s: any) => s != null);
        results.push({ location_id: locId, location_name: data?.[0]?.locations?.name ?? locId, audit_count: scores.length, avg_score: scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null, min_score: scores.length > 0 ? Math.min(...scores) : null, max_score: scores.length > 0 ? Math.max(...scores) : null });
      }
      return { date_range: { from: args.from, to: args.to }, comparisons: results };
    }

    case "get_open_corrective_actions": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      let q = sb.from("corrective_actions").select("id, title, severity, status, due_date, created_at, location_id, locations(name), assigned_to")
        .in("status", ["open", "in_progress"]).order("created_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.severity) q = q.eq("severity", args.severity);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, corrective_actions: c.items.map((ca: any) => ({ id: ca.id, title: ca.title, severity: ca.severity, status: ca.status, due_date: ca.due_date, location: ca.locations?.name, assigned_to: ca.assigned_to })) };
    }

    case "get_task_completion_summary": {
      let q = sb.from("task_completions").select("id, completed_at, task_id, tasks(title, location_id, locations(name))").gte("completed_at", args.from).lte("completed_at", args.to + "T23:59:59Z");
      if (args.location_id) q = q.eq("tasks.location_id", args.location_id);
      const { data, error } = await q.limit(500);
      if (error) return { error: error.message };
      return { date_range: { from: args.from, to: args.to }, completions_count: (data ?? []).length };
    }

    case "get_attendance_exceptions": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      const ur2 = await utcRange(sb, args.from, args.to);
      if (!ur2) return { error: "Failed to convert date range" };
      let q = sb.from("attendance_logs").select("id, staff_id, employees(full_name), check_in_at, check_out_at, is_late, late_minutes, auto_clocked_out, location_id, locations(name)")
        .gte("check_in_at", ur2.fromUtc).lt("check_in_at", ur2.toUtc)
        .or("is_late.eq.true,check_out_at.is.null").order("check_in_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, exceptions: c.items.map((l: any) => ({ id: l.id, employee: l.employees?.full_name, check_in: l.check_in_at, check_out: l.check_out_at, is_late: l.is_late, late_minutes: l.late_minutes, auto_clocked_out: l.auto_clocked_out, location: l.locations?.name })) };
    }

    case "get_work_order_status": {
      const limit = Math.min(args.limit || 50, MAX_TOOL_ROWS);
      let q = sb.from("cmms_work_orders").select("id, title, status, priority, created_at, location_id, locations(name)").order("created_at", { ascending: false }).limit(limit);
      if (args.location_id) q = q.eq("location_id", args.location_id);
      if (args.status) q = q.eq("status", args.status);
      else q = q.in("status", ["open", "in_progress"]);
      const { data, error } = await q;
      if (error) return { error: error.message };
      const c = cap(data, limit);
      return { ...c, work_orders: c.items.map((w: any) => ({ id: w.id, title: w.title, status: w.status, priority: w.priority, location: w.locations?.name })) };
    }

    case "get_document_expiries": {
      const daysAhead = args.days_ahead || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + daysAhead);
      const { data, error } = await sb.from("documents").select("id, title, expiry_date, status").not("expiry_date", "is", null).lte("expiry_date", cutoff.toISOString()).order("expiry_date", { ascending: true }).limit(50);
      if (error) return { error: error.message };
      return { days_ahead: daysAhead, documents: (data ?? []).map((d: any) => ({ id: d.id, title: d.title, expiry_date: d.expiry_date, expired: new Date(d.expiry_date) < new Date() })) };
    }

    case "get_training_gaps": {
      let q = sb.from("training_assignments").select("id, employee_id, employees(full_name, location_id, locations(name)), training_module_id, training_modules(title), status, due_date")
        .in("status", ["assigned", "in_progress"]);
      if (args.location_id) q = q.eq("employees.location_id", args.location_id);
      const { data, error } = await q.limit(100);
      if (error) return { error: error.message };
      const overdue = (data ?? []).filter((a: any) => a.due_date && new Date(a.due_date) < new Date());
      return { total_incomplete: (data ?? []).length, overdue_count: overdue.length, gaps: (data ?? []).map((a: any) => ({ employee: a.employees?.full_name, module: a.training_modules?.title, status: a.status, due_date: a.due_date, location: a.employees?.locations?.name })) };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── System Prompt Builder ──────────────────────────────────
function buildSystemPrompt(ctx: { role: string; companyName: string; modules: string[]; locations: string[] }): string {
  return `You are **Dash**, the operational command center of Dashspect — a multi-tenant platform for compliance, workforce, and operations management.

## Your Identity
- You are NOT a generic chatbot. You are a governed, permission-aware operational assistant.
- You speak with authority, clarity, and precision.
- You always cite data sources and time ranges.
- You never hallucinate or guess. If data is unavailable, say so clearly.

## Current Context
- **Company**: ${ctx.companyName}
- **User Role**: ${ctx.role}
- **Active Modules**: ${ctx.modules.length > 0 ? ctx.modules.join(", ") : "None detected"}
- **Locations**: ${ctx.locations.length > 0 ? ctx.locations.join(", ") : "Not loaded"}
- **Timezone**: Europe/Bucharest

## Your Capabilities (Phase 1 — Read Only)
You can retrieve and analyze data across modules:
- **Locations**: Search, overview, cross-module summaries
- **Audits**: Results, scores, comparisons between locations
- **Workforce**: Employee search, attendance exceptions
- **Corrective Actions**: Open/overdue items by severity
- **Tasks**: Completion summaries
- **CMMS**: Work order status
- **Documents**: Expiring documents
- **Training**: Gaps and overdue assignments

## Response Guidelines
1. Use **markdown** formatting for readability (headers, bold, lists, tables).
2. Always state the **date range** and **scope** of your analysis.
3. When comparing, use tables for clarity.
4. Provide **actionable recommendations** when appropriate.
5. If a module is not active for this company, inform the user.
6. Keep responses concise but thorough. Prefer structured data over prose.
7. When multiple data points are available, summarize first, then detail.

## What You Cannot Do Yet
- You cannot create, update, or delete records (coming in future phases).
- You cannot upload or process files yet.
- You cannot access other companies' data.
- If asked to do something outside your capabilities, explain what you CAN do instead.`;
}

// ─── Main Handler ───────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { messages, session_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const sbService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Resolve company + role — FIX: use maybeSingle + order for multi-company users
    const { data: cuData, error: cuError } = await sb.from("company_users")
      .select("company_id, company_role")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (cuError || !cuData) {
      return new Response(JSON.stringify({ error: "User not in any company" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const companyId = cuData.company_id;
    const companyRole = cuData.company_role;

    // Resolve platform role
    const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", userId);
    const platformRoles = (roleRows ?? []).map((r: any) => r.role);
    const displayRole = platformRoles.includes("admin") ? "admin" : platformRoles.includes("manager") ? "manager" : companyRole;

    // Get company name
    const { data: companyData } = await sb.from("companies").select("name").eq("id", companyId).single();
    const companyName = companyData?.name ?? "Unknown";

    // Get active modules
    const { data: modulesData } = await sb.from("company_modules").select("module_name").eq("company_id", companyId).eq("is_active", true);
    const activeModules = (modulesData ?? []).map((m: any) => m.module_name);

    // Get locations
    const { data: locationsData } = await sb.from("locations").select("name").eq("company_id", companyId).limit(20);
    const locationNames = (locationsData ?? []).map((l: any) => l.name);

    console.log(`[Dash] User=${userId} Company=${companyId} Role=${displayRole} Modules=${activeModules.length}`);

    const systemPrompt = buildSystemPrompt({ role: displayRole, companyName, modules: activeModules, locations: locationNames });
    let conversationMessages = [{ role: "system", content: systemPrompt }, ...messages];

    const maxIterations = 6;
    let iteration = 0;
    const toolsUsed: string[] = [];

    while (iteration < maxIterations) {
      iteration++;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: conversationMessages,
          tools,
          tool_choice: "auto",
          stream: false,
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const txt = await response.text();
        console.error("AI gateway error:", status, txt);
        return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const result = await response.json();
      const choice = result.choices?.[0];
      if (!choice) throw new Error("No response from AI");

      const msg = choice.message;

      // Tool calls — pass activeModules for module gating
      if (msg.tool_calls?.length) {
        conversationMessages.push(msg);
        for (const tc of msg.tool_calls) {
          let args: any;
          try { args = JSON.parse(tc.function.arguments); } catch { args = {}; }
          toolsUsed.push(tc.function.name);
          const toolResult = await executeTool(sb, tc.function.name, args, companyId, displayRole, activeModules);
          conversationMessages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) });
        }
        continue;
      }

      // Final text response — stream it
      const finalContent = msg.content || "";

      // Log action
      try {
        await sbService.from("dash_action_log").insert({
          company_id: companyId,
          user_id: userId,
          session_id: session_id || null,
          action_type: "read",
          action_name: "chat_response",
          risk_level: "low",
          request_json: { question: messages?.[messages.length - 1]?.content?.substring(0, 500) },
          result_json: { answer_preview: finalContent.substring(0, 500), tools_used: toolsUsed },
          status: "success",
          approval_status: "not_required",
          modules_touched: [...new Set(toolsUsed.map(t => {
            if (t.includes("audit")) return "audits";
            if (t.includes("employee") || t.includes("attendance")) return "workforce";
            if (t.includes("task")) return "tasks";
            if (t.includes("corrective")) return "corrective_actions";
            if (t.includes("work_order")) return "cmms";
            if (t.includes("document")) return "documents";
            if (t.includes("training")) return "training";
            return "general";
          }))],
        });
      } catch (logErr) {
        console.error("Failed to log Dash action:", logErr);
      }

      // Save/update session
      if (session_id) {
        try {
          await sbService.from("dash_sessions").upsert({
            id: session_id,
            company_id: companyId,
            user_id: userId,
            title: messages?.[0]?.content?.substring(0, 100) || "Dash conversation",
            messages_json: [...messages, { role: "assistant", content: finalContent }],
            status: "active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "id" });
        } catch (sessErr) {
          console.error("Failed to save session:", sessErr);
        }
      }

      // Stream response as SSE
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          const chunkSize = 30;
          let pos = 0;
          const sendChunks = () => {
            if (pos < finalContent.length) {
              const chunk = finalContent.slice(pos, pos + chunkSize);
              pos += chunkSize;
              const sseData = { id: `dash-${Date.now()}`, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model: "dash-command", choices: [{ index: 0, delta: { content: chunk }, finish_reason: null }] };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(sseData)}\n\n`));
              setTimeout(sendChunks, 8);
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\n`));
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            }
          };
          sendChunks();
        },
      });

      return new Response(stream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    return new Response(JSON.stringify({ error: "Max iterations exceeded" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Dash command error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
