

# Fix: Kiosk Dashboard Empty After RPC Migration

## Root Cause Analysis

The kiosk data is empty because of a **token mismatch** between how `useKioskByToken` finds the kiosk and how the RPCs validate the token:

1. `useKioskByToken` uses **case-insensitive `ilike`** fallback to find the kiosk record — so even if the URL has different casing (e.g., `LBFC-Amzei-1` vs `lbfc-amzei-1`), it finds the kiosk
2. But `kioskToken` passed to `KioskDashboard` comes **from the URL** (line 259: `kioskToken={kioskToken}`), not from the DB record
3. The `get_kiosk_employees` RPC uses **exact `=` comparison** on `custom_slug` — if casing differs, it returns 0 employees
4. 0 employees → `todaysTeam = 0` → tasks forced to `[]` (line 258) → everything cascades to empty

The same token mismatch affects ALL kiosk RPCs (`get_kiosk_attendance_logs`, `get_kiosk_tasks`, `get_kiosk_task_completions`), but previously employees bypassed this via RLS (no token needed). Now that employees also use an RPC, the issue is exposed.

## The Fix (2 surgical changes)

### 1. Use canonical token from DB record (AttendanceKiosk.tsx, line 259)

Instead of passing the URL-derived `kioskToken`, pass the kiosk's actual `custom_slug` or `device_token` from the DB record:

```typescript
// Before:
kioskToken={kioskToken}

// After:
kioskToken={kiosk.custom_slug || kiosk.device_token}
```

This guarantees every RPC receives the exact value stored in the database, regardless of URL casing or encoding.

### 2. Add case-insensitive slug matching to the RPC (defense in depth)

Update `get_kiosk_employees` to use `ILIKE` for the slug comparison:

```sql
CREATE OR REPLACE FUNCTION public.get_kiosk_employees(...)
-- Change: k.custom_slug = p_token → lower(k.custom_slug) = lower(p_token)
```

Also add `NOTIFY pgrst, 'reload schema'` to ensure PostgREST picks up the function immediately.

### What stays unchanged
- All other kiosk RPCs (attendance, tasks, completions) — already working with canonical tokens
- All admin/manager policies — untouched
- KioskDashboard component logic — only the token source changes
- useKioskByToken hook — untouched
- No RLS policy changes

**2 files changed. 1 migration. Surgical fix.**

