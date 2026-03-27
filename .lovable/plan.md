

# Fix: Dash Can't Find Audits by Location Name

## Problem

The screenshots show a clear contradiction:
- The Audits page shows **3 audits for LBFC Mosilor** completed on 2026-03-25 (82%, 94%, 100%)
- Dash says **"I couldn't find any audits for LBFC Mosilor in the last 30 days"**

**Root cause**: The `get_audit_results` tool only accepts `location_id` (UUID), not `location_name`. The LLM should call `search_locations` first to resolve "Mosilor" → UUID, then pass the UUID to `get_audit_results`. But the system prompt gives no instruction to do this, so the LLM either skips the location filter entirely (returning all audits) or refuses saying it can't search by location.

The same gap exists in `compare_location_performance`, `get_open_corrective_actions`, `get_task_completion_summary`, `get_work_order_status`, and `get_cross_module_summary` — all accept `location_id` but not `location_name`.

## Fix — Two-pronged approach

### 1. Add `location_name` resolution directly into `getAuditResults` (backend)

Instead of depending on the LLM to chain two tool calls (which it frequently fails to do), add a `location_name` parameter to the tool and resolve it server-side — the same pattern already used by `getLocationOverview`.

**File: `supabase/functions/dash-command/capabilities/audits.ts`**
- In `getAuditResults`: if `args.location_name` is provided and `args.location_id` is not, resolve it via `ilike` query on `locations` table filtered by `company_id`
- If no match found, return a clear error: `No location matching "X"`

**File: `supabase/functions/dash-command/tools.ts`**
- Add `location_name: { type: "string", description: "Location name (partial match, resolved to ID automatically)" }` to `get_audit_results` parameters

### 2. Add the same pattern to `compareLocationPerformance`

**File: `supabase/functions/dash-command/capabilities/audits.ts`**
- In `compareLocationPerformance`: accept `location_names` (array of strings) as an alternative to `location_ids`, resolve each name server-side

**File: `supabase/functions/dash-command/tools.ts`**
- Add `location_names` parameter to `compare_location_performance`

### 3. Add a system prompt hint for chained resolution

**File: `supabase/functions/dash-command/index.ts`** — in `buildSystemPrompt`
- Add a short instruction: "When any tool needs a location_id and the user provides a name, you can pass location_name directly — the tool resolves it automatically. You can also call search_locations first if you need to disambiguate."

## Files to change

| File | Change |
|------|--------|
| `supabase/functions/dash-command/capabilities/audits.ts` | Add `location_name` resolution in `getAuditResults` and `compareLocationPerformance` |
| `supabase/functions/dash-command/tools.ts` | Add `location_name` param to `get_audit_results` and `location_names` to `compare_location_performance` |
| `supabase/functions/dash-command/index.ts` | Add system prompt hint about location name auto-resolution |

## Validation

- Ask Dash: "when was the last audit on Mosilor location?" → should return the Mar 25 audits
- Ask Dash: "show me audits for Amzei this week" → should return the 3 Amzei audits from Mar 24
- Ask Dash: "compare Mosilor vs Amzei last 7 days" → should work with names, not require UUIDs

