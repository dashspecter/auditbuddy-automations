

# Fix: Dash Can't Answer "Who is Working Today?"

## Problem

The user asks *"how many employees are working today at LBFC Amzei?"* — Dash says "no attendance logs" despite 2 employees checked in at LBFC Amzei (Thayab Abdullah 09:51, Zack Adeyanju 09:42).

**Root cause**: Dash only has `get_attendance_exceptions` which filters for `is_late = true OR check_out_at IS NULL` (exceptions only). There is **no tool** to retrieve general attendance data — who checked in, who is currently working, total check-ins. The LLM has no way to answer "who is working today?" or "how many people checked in?"

Additionally, `get_attendance_exceptions` only accepts `location_id` (UUID), not `location_name` — same gap we just fixed for audits.

## Fix

### 1. Add new tool: `get_attendance_summary`

A read-only tool that returns all attendance logs for a date range, optionally filtered by location name or ID. Returns: employee name, check-in/out times, status (working/completed), location, late info.

**File: `supabase/functions/dash-command/capabilities/workforce.ts`**
- Add `getAttendanceSummary` function
- Accept `from`, `to`, `location_name`, `location_id`, `limit`
- Resolve `location_name` → ID via `ilike` (same pattern as audits)
- Scope to company via location IDs (attendance_logs has no company_id)
- Return all logs, not just exceptions
- Include computed `status`: "working" (no check_out) vs "completed"

### 2. Add `location_name` to `get_attendance_exceptions`

**File: `supabase/functions/dash-command/capabilities/workforce.ts`**
- In `getAttendanceExceptions`: resolve `location_name` → `location_id` if provided

### 3. Register the new tool

**File: `supabase/functions/dash-command/tools.ts`**
- Add `get_attendance_summary` tool definition with `from`, `to`, `location_name`, `location_id`, `limit`
- Add `location_name` param to `get_attendance_exceptions`

### 4. Wire up routing + permissions

**File: `supabase/functions/dash-command/index.ts`**
- Add case for `get_attendance_summary` → call `getAttendanceSummary`
- Add to tool-module mapping: `get_attendance_summary: "workforce"`
- Update system prompt: mention this tool for "who is working", "attendance today", "how many checked in"

**File: `supabase/functions/dash-command/registry.ts`**
- Add `get_attendance_summary` to workforce reads

## Files to change

| File | Change |
|------|--------|
| `supabase/functions/dash-command/capabilities/workforce.ts` | Add `getAttendanceSummary`; add `location_name` resolution to `getAttendanceExceptions` |
| `supabase/functions/dash-command/tools.ts` | Add `get_attendance_summary` tool; add `location_name` to exceptions tool |
| `supabase/functions/dash-command/index.ts` | Route new tool; update module map and system prompt |
| `supabase/functions/dash-command/registry.ts` | Add to workforce reads |

## Validation

- Ask Dash: "how many employees are working today at LBFC Amzei?" → should return 2 (Thayab, Zack)
- Ask Dash: "who checked in today?" → should return all 4 check-ins
- Ask Dash: "attendance exceptions today" → should still work (late/missing checkout only)

