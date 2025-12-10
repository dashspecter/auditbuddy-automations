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

// ============ OPERATIONS AGENT LOGIC ============

interface SLARule {
  metric: string;
  operator: string;
  threshold: number;
  action: string;
}

interface ChecklistItem {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  source: string;
  completed: boolean;
}

interface Issue {
  id: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  detected_at: string;
}

// Generate daily operations checklist
async function generateDailyOps(companyId: string, locationId: string, date: string) {
  const supabase = getSupabase();
  const checklist: ChecklistItem[] = [];
  const issues: Issue[] = [];

  console.log(`[OperationsAgent] Generating daily ops for location ${locationId} on ${date}`);

  // 1. Fetch SLA configs for this location
  const { data: slaConfigs } = await supabase
    .from("location_sla_configs")
    .select("*")
    .eq("company_id", companyId)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .eq("active", true);

  // Add SLA-based checklist items
  if (slaConfigs) {
    for (const sla of slaConfigs) {
      checklist.push({
        id: `sla-${sla.id}`,
        task: `Verify SLA: ${sla.sla_name}`,
        priority: "high",
        source: "sla",
        completed: false,
      });
    }
  }

  // 2. Fetch pending maintenance tasks
  const { data: maintenanceTasks } = await supabase
    .from("maintenance_tasks")
    .select("*, equipment:equipment_id(name)")
    .eq("company_id", companyId)
    .eq("location_id", locationId)
    .in("status", ["pending", "overdue"])
    .lte("scheduled_for", new Date(date + "T23:59:59Z").toISOString());

  if (maintenanceTasks) {
    for (const task of maintenanceTasks) {
      const equipmentName = (task.equipment as any)?.name || "Unknown Equipment";
      checklist.push({
        id: `maint-${task.id}`,
        task: `${task.task_type}: ${equipmentName}`,
        priority: task.status === "overdue" ? "high" : "medium",
        source: "maintenance",
        completed: false,
      });

      if (task.status === "overdue") {
        issues.push({
          id: `issue-maint-${task.id}`,
          type: "overdue_maintenance",
          severity: "high",
          description: `Overdue maintenance: ${task.task_type} for ${equipmentName}`,
          detected_at: new Date().toISOString(),
        });
      }
    }
  }

  // 3. Check equipment status
  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .eq("company_id", companyId)
    .eq("location_id", locationId);

  if (equipment) {
    const needsAttention = equipment.filter(e => 
      e.status === "needs_repair" || e.status === "out_of_service"
    );
    
    for (const eq of needsAttention) {
      issues.push({
        id: `issue-eq-${eq.id}`,
        type: "equipment_issue",
        severity: eq.status === "out_of_service" ? "critical" : "high",
        description: `Equipment ${eq.name} is ${eq.status}`,
        detected_at: new Date().toISOString(),
      });
    }
  }

  // 4. Read patterns from agent memory
  const { data: memories } = await supabase
    .from("agent_memory")
    .select("*")
    .eq("company_id", companyId)
    .eq("agent_type", "operations")
    .eq("memory_type", "pattern")
    .order("created_at", { ascending: false })
    .limit(10);

  // Add pattern-based items
  if (memories) {
    for (const mem of memories) {
      const content = mem.content_json as any;
      if (content.recommendation) {
        checklist.push({
          id: `pattern-${mem.id}`,
          task: content.recommendation,
          priority: "medium",
          source: "pattern",
          completed: false,
        });
      }
    }
  }

  // Calculate health score
  const healthScore = computeHealthScore(issues, checklist);

  // Upsert daily ops record
  const { data: dailyOps, error } = await supabase
    .from("location_daily_ops")
    .upsert({
      company_id: companyId,
      location_id: locationId,
      date: date,
      checklist_json: checklist,
      issues_found_json: issues,
      location_health_score: healthScore,
      status: "draft",
    }, {
      onConflict: "location_id,date",
    })
    .select()
    .single();

  if (error) {
    console.error("[OperationsAgent] Error creating daily ops:", error);
    throw error;
  }

  // Log to agent_logs
  await supabase.from("agent_logs").insert({
    company_id: companyId,
    agent_type: "operations",
    event_type: "daily_ops_generated",
    details_json: {
      location_id: locationId,
      date,
      checklist_count: checklist.length,
      issues_count: issues.length,
      health_score: healthScore,
    },
  });

  // Store observation in memory
  await supabase.from("agent_memory").insert({
    company_id: companyId,
    agent_type: "operations",
    memory_type: "observation",
    content_json: {
      type: "daily_ops_generated",
      location_id: locationId,
      date,
      health_score: healthScore,
      issues_count: issues.length,
    },
  });

  return dailyOps;
}

// Evaluate SLAs for a location
async function evaluateSLAs(companyId: string, locationId: string) {
  const supabase = getSupabase();
  const events: any[] = [];

  console.log(`[OperationsAgent] Evaluating SLAs for location ${locationId}`);

  // Get active SLA configs
  const { data: slaConfigs } = await supabase
    .from("location_sla_configs")
    .select("*")
    .eq("company_id", companyId)
    .or(`location_id.eq.${locationId},location_id.is.null`)
    .eq("active", true);

  if (!slaConfigs || slaConfigs.length === 0) {
    return { events: [], message: "No SLA configs found" };
  }

  for (const sla of slaConfigs) {
    const rules = sla.rules_json as SLARule[];
    
    for (const rule of rules) {
      const violated = await checkSLARule(supabase, companyId, locationId, rule);
      
      if (violated) {
        const { data: event } = await supabase
          .from("sla_events")
          .insert({
            company_id: companyId,
            location_id: locationId,
            sla_config_id: sla.id,
            status: "triggered",
            details_json: {
              rule,
              message: `SLA violated: ${sla.sla_name} - ${rule.metric} ${rule.operator} ${rule.threshold}`,
            },
          })
          .select()
          .single();

        if (event) events.push(event);

        // Store in memory
        await supabase.from("agent_memory").insert({
          company_id: companyId,
          agent_type: "operations",
          memory_type: "observation",
          content_json: {
            type: "sla_violation",
            sla_id: sla.id,
            sla_name: sla.sla_name,
            rule,
            location_id: locationId,
          },
        });
      }
    }
  }

  // Log evaluation
  await supabase.from("agent_logs").insert({
    company_id: companyId,
    agent_type: "operations",
    event_type: "sla_evaluation",
    details_json: {
      location_id: locationId,
      slas_checked: slaConfigs.length,
      violations_found: events.length,
    },
  });

  return { events, message: `Evaluated ${slaConfigs.length} SLAs, found ${events.length} violations` };
}

// Check a single SLA rule
async function checkSLARule(supabase: any, companyId: string, locationId: string, rule: SLARule): Promise<boolean> {
  // This is a simplified implementation - in production you'd check actual metrics
  switch (rule.metric) {
    case "equipment_uptime":
      const { count: downCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .in("status", ["out_of_service", "needs_repair"]);
      
      const { count: totalCount } = await supabase
        .from("equipment")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("location_id", locationId);
      
      if (totalCount && totalCount > 0) {
        const uptime = ((totalCount - (downCount || 0)) / totalCount) * 100;
        return compareValues(uptime, rule.operator, rule.threshold);
      }
      return false;

    case "overdue_maintenance":
      const { count: overdueCount } = await supabase
        .from("maintenance_tasks")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("location_id", locationId)
        .eq("status", "overdue");
      
      return compareValues(overdueCount || 0, rule.operator, rule.threshold);

    default:
      return false;
  }
}

function compareValues(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case ">": return value > threshold;
    case "<": return value < threshold;
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case "=": return value === threshold;
    default: return false;
  }
}

// Compute location health score
function computeHealthScore(issues: Issue[], checklist: ChecklistItem[]): number {
  let score = 100;

  // Deduct points for issues
  for (const issue of issues) {
    switch (issue.severity) {
      case "critical": score -= 25; break;
      case "high": score -= 15; break;
      case "medium": score -= 10; break;
      case "low": score -= 5; break;
    }
  }

  // Deduct for incomplete high-priority items
  const incompletePriority = checklist.filter(c => !c.completed && c.priority === "high").length;
  score -= incompletePriority * 5;

  return Math.max(0, Math.min(100, score));
}

// Plan maintenance based on various inputs
async function planMaintenance(companyId: string, locationId: string) {
  const supabase = getSupabase();
  const newTasks: any[] = [];

  console.log(`[OperationsAgent] Planning maintenance for location ${locationId}`);

  // 1. Check equipment that needs scheduled maintenance
  const { data: equipment } = await supabase
    .from("equipment")
    .select("*")
    .eq("company_id", companyId)
    .eq("location_id", locationId);

  if (equipment) {
    for (const eq of equipment) {
      // Check if there's a pending/scheduled task already
      const { data: existingTask } = await supabase
        .from("maintenance_tasks")
        .select("id")
        .eq("equipment_id", eq.id)
        .in("status", ["pending", "in_progress"])
        .maybeSingle();

      if (!existingTask && eq.next_check_date) {
        const nextCheck = new Date(eq.next_check_date);
        const now = new Date();
        const daysUntilCheck = Math.ceil((nextCheck.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilCheck <= 7) {
          const { data: task } = await supabase
            .from("maintenance_tasks")
            .insert({
              company_id: companyId,
              location_id: locationId,
              equipment_id: eq.id,
              task_type: "scheduled_check",
              scheduled_for: eq.next_check_date,
              status: daysUntilCheck < 0 ? "overdue" : "pending",
              notes: `Auto-generated: Scheduled check for ${eq.name}`,
              created_by_agent: true,
            })
            .select()
            .single();

          if (task) newTasks.push(task);
        }
      }
    }
  }

  // 2. Create tasks based on SLA violations
  const { data: recentViolations } = await supabase
    .from("sla_events")
    .select("*, sla_config:sla_config_id(*)")
    .eq("company_id", companyId)
    .eq("location_id", locationId)
    .eq("status", "triggered")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  if (recentViolations) {
    for (const violation of recentViolations) {
      const details = violation.details_json as any;
      const slaConfig = violation.sla_config as any;
      
      if (details?.rule?.action === "create_maintenance_task") {
        const { data: task } = await supabase
          .from("maintenance_tasks")
          .insert({
            company_id: companyId,
            location_id: locationId,
            task_type: "sla_remediation",
            scheduled_for: new Date().toISOString(),
            status: "pending",
            notes: `Auto-generated: Remediation for SLA violation - ${slaConfig?.sla_name || "Unknown SLA"}`,
            created_by_agent: true,
          })
          .select()
          .single();

        if (task) newTasks.push(task);
      }
    }
  }

  // Log
  await supabase.from("agent_logs").insert({
    company_id: companyId,
    agent_type: "operations",
    event_type: "maintenance_planned",
    details_json: {
      location_id: locationId,
      tasks_created: newTasks.length,
    },
  });

  return { tasks: newTasks, message: `Created ${newTasks.length} maintenance tasks` };
}

// ============ HTTP HANDLER ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace("/operations-agent", "");

    if (req.method === "POST" && path === "/generate-daily-ops") {
      const { company_id, location_id, date } = await req.json();
      
      if (!company_id || !location_id || !date) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: company_id, location_id, date" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await generateDailyOps(company_id, location_id, date);
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/evaluate-slas") {
      const { company_id, location_id } = await req.json();
      
      if (!company_id || !location_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: company_id, location_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await evaluateSLAs(company_id, location_id);
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/plan-maintenance") {
      const { company_id, location_id } = await req.json();
      
      if (!company_id || !location_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: company_id, location_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await planMaintenance(company_id, location_id);
      return new Response(
        JSON.stringify({ success: true, data: result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST" && path === "/run") {
      const { company_id, location_id, goal, mode = "simulate" } = await req.json();
      
      if (!company_id || !location_id) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: company_id, location_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const supabase = getSupabase();
      const today = new Date().toISOString().split("T")[0];

      // Create task record
      const { data: task } = await supabase
        .from("agent_tasks")
        .insert({
          company_id,
          agent_type: "operations",
          goal: goal || "Daily operations check",
          input_json: { location_id, date: today, mode },
          status: "running",
        })
        .select()
        .single();

      if (mode === "simulate") {
        // Log what would happen
        await supabase.from("agent_logs").insert({
          company_id,
          agent_type: "operations",
          task_id: task?.id,
          event_type: "simulation",
          details_json: {
            would_execute: [
              "generateDailyOps",
              "evaluateSLAs",
              "planMaintenance",
            ],
            location_id,
            date: today,
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
      const dailyOps = await generateDailyOps(company_id, location_id, today);
      const slaResult = await evaluateSLAs(company_id, location_id);
      const maintenanceResult = await planMaintenance(company_id, location_id);

      // Update task
      await supabase
        .from("agent_tasks")
        .update({
          status: "completed",
          result_json: {
            daily_ops: dailyOps,
            sla_evaluation: slaResult,
            maintenance_planning: maintenanceResult,
          },
        })
        .eq("id", task?.id);

      return new Response(
        JSON.stringify({ 
          success: true,
          mode,
          task_id: task?.id,
          data: {
            daily_ops: dailyOps,
            sla_evaluation: slaResult,
            maintenance_planning: maintenanceResult,
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
    console.error("[OperationsAgent] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
