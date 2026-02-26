

# Audit Fix Plan — All Scout Issues

## Summary of Confirmed Issues

After inspecting the database schema, triggers, and frontend code, here are the confirmed bugs:

| # | Severity | Issue | Evidence |
|---|----------|-------|----------|
| 1 | **P0** | Trigger `fn_notify_scout_on_submission_status` references `sj.scout_id` which does not exist — column is `assigned_scout_id` | DB function source + `scout_jobs` schema confirms only `assigned_scout_id` exists |
| 2 | **P1** | `useScoutAnalyticsKPIs` queries `scout_disputes.company_id` — column does not exist | `scout_disputes` has: id, job_id, scout_id, status, message, attachments, resolution_notes, resolved_by, created_at, closed_at |
| 3 | **P1** | `useScoutPayoutSummary` queries `scout_payouts.company_id` — column does not exist | `scout_payouts` has: id, scout_id, job_id, amount, currency, status, method, paid_at, created_at |
| 4 | **P1** | `ScoutOperationsTab` displays `d.reason` but `scout_disputes` has `message`, not `reason` | Schema confirmed |
| 5 | **P2** | Missing indexes on `scout_disputes` (scout_id, job_id) and `scout_payouts` (scout_id, job_id) | Only PK index exists on `scout_disputes` |

---

## Fix Phase 1: Database Migration

A single migration to fix the trigger and add indexes.

### 1a. Fix `fn_notify_scout_on_submission_status`
Replace `sj.scout_id` with `sj.assigned_scout_id` in the function body.

### 1b. Add missing indexes
- `idx_scout_disputes_scout_id` on `scout_disputes(scout_id)`
- `idx_scout_disputes_job_id` on `scout_disputes(job_id)`
- `idx_scout_payouts_scout_id` on `scout_payouts(scout_id)`
- `idx_scout_payouts_job_id` on `scout_payouts(job_id)`

---

## Fix Phase 2: Frontend Code Fixes

### 2a. `useScoutAnalytics.ts` — Fix dispute rate query (line 105-108)
**Problem:** `.eq("company_id", companyId!)` on `scout_disputes` which lacks that column.
**Fix:** Join through `scout_jobs` to scope by company. Query `scout_disputes` joined with `scout_jobs!inner(company_id)` filtered by company_id, or do a two-step: get job IDs for company, then count disputes for those jobs.

### 2b. `useScoutAnalytics.ts` — Fix payout summary query (line 264-267)
**Problem:** `.eq("company_id", companyId!)` on `scout_payouts` which lacks that column.
**Fix:** Same approach — join through `scout_jobs` via `job_id` to filter by company. Get company job IDs first, then filter payouts by those job IDs.

### 2c. `ScoutOperationsTab.tsx` — Fix dispute display (line 106)
**Problem:** Renders `d.reason` but the column is `message`.
**Fix:** Change `d.reason` to `d.message` in the dispute list rendering and in the select query.

---

## Files Changed

| File | Change Type | What |
|------|-------------|------|
| Migration SQL | DB migration | Fix trigger function + add 4 indexes |
| `src/hooks/useScoutAnalytics.ts` | Code fix | Fix dispute rate query (two-step via job IDs) and payout summary query (two-step via job IDs) |
| `src/components/admin/ScoutOperationsTab.tsx` | Code fix | Change `reason` to `message` in select + render |

---

## Technical Details

### Dispute rate fix approach (useScoutAnalyticsKPIs)
```typescript
// Step 1: Get all job IDs for this company
const jobIds = allJobs.map(j => j.id);
// Step 2: Count disputes for those jobs
const { count: disputeCount } = await (supabase as any)
  .from("scout_disputes")
  .select("id", { count: "exact", head: true })
  .in("job_id", jobIds);
```

### Payout summary fix approach (useScoutPayoutSummary)
```typescript
// Step 1: Get job IDs for company
const { data: companyJobs } = await supabase
  .from("scout_jobs")
  .select("id")
  .eq("company_id", companyId!);
const jobIds = (companyJobs ?? []).map(j => j.id);
if (jobIds.length === 0) return { totalPaid: 0, totalPending: 0, currency: "RON" };
// Step 2: Get payouts for those jobs
const { data: payouts } = await (supabase as any)
  .from("scout_payouts")
  .select("amount, status, currency")
  .in("job_id", jobIds);
```

### ScoutOperationsTab fix
- Select query: change `reason` to `message` in the select string
- Render: change `d.reason` to `d.message`

