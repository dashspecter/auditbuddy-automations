

# Fix: Dash location lookup uses wrong column — returns zero locations

## Problem

Screenshot shows: *"no active locations found for Fresh Brunch SRL"* — but 7+ active locations exist.

**Root cause**: Line 876 in `dash-command/index.ts`:
```typescript
.eq("is_active", true)
```

The `locations` table has **no `is_active` column**. It uses `status` (text) with value `'active'`. This query silently returns zero rows.

Additionally, the query has **no company scoping** — it should filter by `company_id`.

## Fix

**File**: `supabase/functions/dash-command/index.ts` (line 876)

Change:
```typescript
const { data: allLocs } = await sb.from("locations").select("id").eq("is_active", true).limit(100);
```

To:
```typescript
const { data: allLocs } = await sb.from("locations").select("id").eq("status", "active").eq("company_id", companyId).limit(100);
```

This is a one-line fix. After deployment, "Compare audit scores between all locations this month" will correctly find all 7+ active locations and return real comparison data.

