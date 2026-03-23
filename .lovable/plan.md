

# Fix: Dash-Created Shifts Not Visible in Schedule

## Investigation Summary

I verified the actual shift record in the database (`977bbc0e-...`):
- `shift_date: 2024-07-30` (WRONG — today is 2026-03-23)
- `is_published: false` (should be `true` per user preference)
- `status: draft` (should be `published`)
- No `shift_assignment` row exists (employee was never linked)
- "Alex Grecea" does NOT exist in the employees table (no match found)

Despite the previous code fix adding `is_published: true` and assignment logic, the deployed function apparently ran with the old code for this shift. Additionally, the system prompt does NOT include the current date, so the LLM used "July 30, 2024" (hallucinated).

## Root Causes (4 issues)

### Issue 1 — No current date in system prompt (CRITICAL)
`buildSystemPrompt()` does not include today's date. The LLM has no way to know what "today" means, so it hallucinated `2024-07-30`. Every shift created via "today" will have the wrong date.

### Issue 2 — Employee name validation missing (CRITICAL)
When `employee_name` is provided but no match is found in the employees table, the handler silently continues with `employee_id: null`. The user selected "Block and ask" — the draft should fail with a `missing_fields` error when the employee cannot be resolved.

### Issue 3 — Shift should be published immediately (per user preference)
The previous fix already sets `is_published: true` in `execute_shift_creation`. This is confirmed correct. However, the `status` column default is `'draft'` and must be explicitly set to `'published'` — which the fix also does. This was already addressed but the deployed version for the user's test may not have had it. Will verify the current code is correct (it is).

### Issue 4 — `assigned_by` column is NOT NULL but could fail
The `shift_assignments` table has `assigned_by uuid NOT NULL`. The execute handler sets `assigned_by: userId`. This is correct.

## Changes

### File: `supabase/functions/dash-command/index.ts`

**A) Add current date to system prompt (line ~1714)**

Add a `- **Today**: 2026-03-23 (Monday)` line to the Current Context section. Use `new Date().toLocaleDateString()` dynamically.

Update `buildSystemPrompt` signature to accept `today: string` and inject it.

**B) Block draft when employee not found (lines ~1007-1017)**

Currently:
```typescript
if (employeeName && !employeeId) {
  const { data: empData } = await sb.from("employees")...
  if (empData?.[0]) { employeeId = empData[0].id; employeeName = empData[0].full_name; }
}
```

Change to: if `employee_name` was provided but the query returns no match, add `"employee"` to `missing_fields` and set `can_approve: false`. Include a message like `"Employee '${args.employee_name}' not found in this company."`.

**C) Pass today's date when building the system prompt (line ~1871)**

```typescript
const today = new Date().toISOString().slice(0, 10);
const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long' });
const systemPrompt = buildSystemPrompt({
  role: displayRole, companyName, modules: activeModules,
  locations: locationNames, today, todayLabel
});
```

### Redeploy

Redeploy `dash-command` edge function.

## Expected Behavior After Fix

1. User says "add Alex Grecea to the schedule today in Amzei"
2. Dash resolves "today" correctly as `2026-03-23` (from system prompt context)
3. Dash searches for "Alex Grecea" → no match found
4. Draft returns `missing_fields: ["employee"]` with message "Employee 'Alex Grecea' not found"
5. ActionPreviewCard shows "Missing required fields: employee" with Approve button disabled
6. Dash asks user to clarify or pick from existing employees
7. Once correct employee is selected and approved, shift is created with `is_published: true`, `status: 'published'`, and a `shift_assignment` row
8. Shift appears immediately in the scheduling grid

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Add today's date to system prompt, block draft when employee not found |

