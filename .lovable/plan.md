

# Analysis: Is Restricting Kiosk RLS to `anon` Safe?

## Short Answer: No — there is a real risk of breaking active kiosks.

## The Problem with the Proposed Fix

The proposed change would restrict the `SELECT` policy on `attendance_kiosks` to the `anon` role only. Here's why that's risky:

### How kiosk lookup works today

When a kiosk device loads `/kiosk/:token`, the `useKioskByToken` hook queries the `attendance_kiosks` table **directly** (not via an RPC). The Supabase client uses whatever session is in `localStorage`:

- **Fresh browser** (no session) → `anon` role → would match the new anon-only policy → works
- **Browser with a stale login session** (someone once logged in on that device) → `authenticated` role → would NOT match the anon-only policy → falls through to `"Users can view kiosks in their company"` → fails if the logged-in user belongs to a different company → **kiosk breaks with empty screen**

This is a known issue — the memory notes confirm: *"handling stale authenticated sessions on shared devices"* is why the RPCs were built as `SECURITY DEFINER`. But the **initial kiosk lookup itself was never converted to an RPC**. It still queries the table directly and relies on the permissive public SELECT policy.

### The `last_active_at` update has the same problem

The kiosk page calls `.update({ last_active_at })` on `attendance_kiosks` every 30 seconds. The UPDATE policy `"Public can update kiosk last_active_at"` is also `roles: {public}`. If we restrict the SELECT to anon but leave the UPDATE as-is, we'd have an inconsistency. If we restrict UPDATE too, the keep-alive pings would fail for authenticated sessions.

### What about the `locations` and `departments` joins?

The kiosk lookup also joins `locations` and `departments`. If those tables have company-scoped RLS, the join could return `null` for cross-company lookups even if the kiosk row itself is found. This is another surface where stale auth could cause partial data.

## The Safe Fix (Two-Part)

### Part 1: Immediate — Fix the management page query (zero risk)

The root cause of "Proper Pizza seeing Fresh Brunch kiosks" is that `useAttendanceKiosks` (the management hook) has **no company_id filter**. Add one:

```typescript
// In useAttendanceKiosks queryFn
const { data: { user } } = await supabase.auth.getUser();
const { data: companyData } = await supabase
  .from("company_users")
  .select("company_id")
  .eq("user_id", user.id)
  .single();

const { data, error } = await supabase
  .from("attendance_kiosks")
  .select(`*, locations:location_id(name), departments:department_id(name)`)
  .eq("company_id", companyData.company_id)  // ← add this filter
  .order("created_at", { ascending: false });
```

This immediately fixes what the user sees. No RLS changes, no risk to kiosks.

### Part 2: Then — Create an RPC for kiosk lookup, then tighten RLS

Once the management page is fixed, we can safely create a `SECURITY DEFINER` RPC (`get_kiosk_by_token_or_slug`) to handle the kiosk lookup, matching the pattern already used for all other kiosk data. Then we can safely restrict the public SELECT policies to `anon` only — or even remove them entirely since the RPC bypasses RLS.

**Migration:**
```sql
CREATE OR REPLACE FUNCTION public.get_kiosk_by_token_or_slug(p_token text)
RETURNS TABLE(...) LANGUAGE plpgsql SECURITY DEFINER ...
```

**Then update `useKioskByToken`** to call the RPC instead of querying the table directly.

**Then safely tighten the RLS** by dropping the permissive public policies and restricting the UPDATE policy to `anon`.

## Summary

| Approach | Fixes management page | Kiosk safe? | Closes RLS leak? |
|----------|----------------------|-------------|-------------------|
| Restrict to anon only (original plan) | Yes | **No** — stale sessions break it | Yes |
| Filter management query only (Part 1) | Yes | Yes — no changes | No |
| Both parts | Yes | Yes | Yes |

**Recommendation**: Do Part 1 first (1 file, zero risk), then Part 2 as a follow-up.

### Files changed

- **Part 1**: `src/hooks/useAttendanceKiosks.ts` — add `company_id` filter to `useAttendanceKiosks`
- **Part 2** (follow-up): 1 migration (new RPC + policy changes) + update `useKioskByToken` in same file

