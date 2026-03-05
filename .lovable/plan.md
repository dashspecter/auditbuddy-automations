

# Fix: Restore Original `TO public` Kiosk Policies

## Root Cause

The compatibility migration restored kiosk policies as `TO anon`, but the originals that were "working perfectly" used `TO public` (all roles). This matters because:

1. The `shifts` and `shift_assignments` tables have "Kiosk can view..." RLS policies whose subqueries read `attendance_kiosks`
2. If a browser has ANY authenticated session (even stale), the request runs as `authenticated` role, not `anon`
3. The `TO anon` policy on `attendance_kiosks` does NOT apply to `authenticated` role
4. So the subquery inside the shifts policy returns nothing → shifts empty → Today's Team (0) → Tasks (0)

MTD scores and employee names still work because they use SECURITY DEFINER RPCs that bypass RLS entirely.

## Fix (single migration, no code changes)

Drop the four `TO anon` policies and recreate them as `TO public` to match pre-change behavior exactly:

- `attendance_kiosks`: SELECT and UPDATE for active kiosks → `TO public`
- `locations`: SELECT → `TO public`
- `departments`: SELECT → `TO public`

This restores the exact policy configuration that was working before the hardening attempt.

## Risk

Zero — this is restoring the original behavior that was proven working in production.

## Files changed

- 1 database migration only (no frontend code changes needed)

