

# Fix 3 Defense-in-Depth Risks → PASS

## Problem Summary

Three read queries lack explicit tenant scoping, relying solely on RLS:

| # | Query | File | Issue |
|---|-------|------|-------|
| P1-a | `task_completions` | `operations.ts:13` | No `company_id` column on table; no company filter at all |
| P1-b | `attendance_logs` in cross-module summary | `overview.ts:63-66` | No `company_id` column; when `location_id` is omitted, zero tenant scoping |
| P2 | `tasks` in location overview | `overview.ts:33` | Has `company_id` but query doesn't use it |

## Fixes

### Fix 1 — `getTaskCompletionSummary` (operations.ts:13-15)

`task_completions` has no `company_id`. It joins to `tasks` which does. Add a sub-query to scope:

```typescript
// Before the main query, get company's task IDs
const { data: companyTasks } = await sb.from("tasks")
  .select("id").eq("company_id", companyId);
const taskIds = (companyTasks ?? []).map((t: any) => t.id);
if (taskIds.length === 0) return success({ date_range: { from: args.from, to: args.to }, completions_count: 0 });

let q = sb.from("task_completions")
  .select("id, completed_at, task_id, tasks(title, location_id, locations(name))")
  .in("task_id", taskIds)
  .gte("completed_at", args.from)
  .lte("completed_at", args.to + "T23:59:59Z");
```

### Fix 2 — `getCrossModuleSummary` attendance (overview.ts:63-66)

`attendance_logs` has `location_id` but no `company_id`. When no `locationFilter` is provided, pre-fetch the company's location IDs:

```typescript
let attQ = sb.from("attendance_logs")
  .select("id, is_late, late_minutes, auto_clocked_out, check_out_at");
if (ur) attQ = attQ.gte("check_in_at", ur.fromUtc).lt("check_in_at", ur.toUtc);
if (locationFilter) {
  attQ = attQ.eq("location_id", locationFilter);
} else {
  // Defense-in-depth: scope to company's locations
  const { data: companyLocs } = await sb.from("locations")
    .select("id").eq("company_id", companyId);
  const locIds = (companyLocs ?? []).map((l: any) => l.id);
  if (locIds.length > 0) attQ = attQ.in("location_id", locIds);
  else return success({ /* empty attendance section */ });
}
```

### Fix 3 — `getLocationOverview` tasks (overview.ts:33)

Add `.eq("company_id", companyId)` to the tasks query:

```typescript
sb.from("tasks").select("id", { count: "exact", head: true })
  .eq("location_id", locationId)
  .eq("company_id", companyId),
```

---

## Files Modified

| File | Change |
|------|--------|
| `capabilities/operations.ts` | Add company-scoped task ID pre-fetch to `getTaskCompletionSummary` |
| `capabilities/overview.ts` | Add company location pre-fetch for attendance; add `company_id` to tasks query |

## Deploy

Redeploy `dash-command` edge function.

