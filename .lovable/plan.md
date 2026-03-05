

# Fix: Schedule Presence Leaks Across Companies

## Problem

The presence channel name is `schedule-presence-${weekKey}` (e.g., `schedule-presence-2026-W10`). This is **global** — every user from every company viewing the same week joins the same channel. So "Proper Pizza" managers see presence from other companies' managers.

## Root Cause

Line 55: `const channelName = \`schedule-presence-${weekKey}\`;`

No company scoping. The channel is shared across all tenants.

## Fix

**Single file change**: `src/hooks/useSchedulePresence.ts`

1. Import `useCompanyContext` to get the company ID
2. Scope the channel name to include company ID: `` `schedule-presence-${companyId}-${weekKey}` ``
3. Also include `company_id` in the tracked presence data for defense-in-depth
4. Filter out any presence entries that don't match the current company (belt-and-suspenders)

**Before:**
```ts
const channelName = `schedule-presence-${weekKey}`;
```

**After:**
```ts
const { company } = useCompanyContext();
const companyId = company?.id;
const channelName = `schedule-presence-${companyId}-${weekKey}`;
```

Plus filter in the sync handler to only show users with matching `company_id`.

No database or RLS changes needed — Realtime Presence is purely client-side state.

