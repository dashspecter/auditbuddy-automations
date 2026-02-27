

# Fix: Shift-Based Role Resolution in CAPA Rules Engine

## Problem
In `supabase/functions/process-capa-rules/index.ts` (lines 59-68), the shift lookup query doesn't include `shifts` in the `.select()` clause, so PostgREST silently ignores the `.filter("shifts.*")` conditions. Step 1 always fails, falling through to step 2 which picks the first alphabetical employee match (Gabriela Mitan) instead of the employee actually on shift (Test).

## Fix
**File: `supabase/functions/process-capa-rules/index.ts`** — Lines 59-70 only.

Replace the broken query with one that includes `shifts!inner(...)` in the select so PostgREST can filter on shift columns:

```typescript
const { data: shiftEmp } = await supabase
  .from("shift_assignments")
  .select("staff_id, shifts!inner(location_id, shift_date), employees!inner(user_id, role)")
  .eq("approval_status", "approved")
  .eq("shifts.location_id", locationId)
  .eq("shifts.shift_date", shiftDate)
  .ilike("employees.role", role)
  .not("employees.user_id", "is", null)
  .limit(1)
  .maybeSingle();
// @ts-ignore - nested join type
const scheduledUserId = shiftEmp?.employees?.user_id;
```

No other lines or files change. Steps 2-4 (fallback resolution) remain untouched.

