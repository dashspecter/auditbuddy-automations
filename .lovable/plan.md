
# Dash audit deep dive: what is wrong, what is missing, and how to fix it

## Bottom line

Yes — audits do exist. This is not primarily a permissions problem. It is a Dash query-logic drift problem.

I verified that for your company (`Fresh Brunch SRL`) there are real audit rows:
- **445 total** audits in `location_audits`
- **366 finished-like** audits (`compliant` / `non-compliant`)
- **79 scheduled**
- For **2026-03-01 → 2026-03-24** there are **80 audits by `audit_date`**
- Of those, **71 are finished/scored** with an average score of **97.3**

So Dash saying “There are no audit results available…” is incorrect.

## Root causes found

### 1) Dash uses the wrong completion status for audits
In `supabase/functions/dash-command/index.ts`:

- `get_location_overview` uses `status = 'completed'`
- `get_audit_results` uses `status = 'completed'`
- `compare_location_performance` uses `status = 'completed'`
- `get_cross_module_summary` computes averages only from `status === 'completed'`

But the real app uses:
- `completed`
- `compliant`
- `non-compliant`
- `non_compliant`

The frontend already codifies this in `src/lib/auditHelpers.ts`.

Effect:
- Dash misses almost all finished audits
- averages become `null`
- comparisons return empty

### 2) Dash uses the wrong date field
Dash audit analytics are filtering by **`created_at`**.
Operationally, these questions should use **`audit_date`**.

Evidence:
- March window by `audit_date`: **80**
- Same window by `created_at`: **69**
- There are **11 audits** whose `audit_date` is in March but whose `created_at` is in February (pre-created/scheduled records)

So even after fixing statuses, Dash would still undercount if it keeps using `created_at`.

### 3) `get_audit_results` references a column that does not exist
`get_audit_results` selects and orders by `completed_at`, but `location_audits` currently does **not** have a `completed_at` column.

Effect:
- this tool is structurally broken
- some audit-result prompts will fail outright instead of just returning wrong data

### 4) The compare tool contract is wrong for “all locations”
`compare_location_performance` currently requires `location_ids`.
But Dash’s own suggested prompt is:
- “Compare audit scores between all locations this month”

There is no proper “list all company locations” tool for this path.
The only location discovery helper is `search_locations(query)`, which is search-based, not “return all active locations”.

Effect:
- the prompt and the tool contract do not match
- the model can end up comparing an empty set and then answering “no results”

### 5) Cross-module summaries are partially right, partially wrong
This explains the confusing response:
- “104 audits were conducted, but average scores are not available.”

Why?
- `get_cross_module_summary` counts audits from raw rows
- but computes the average only from `status === 'completed'`

So Dash can correctly say audits exist, while still claiming no average exists.

## Code-level places that need hardening

### `supabase/functions/dash-command/index.ts`
Primary broken zones:
- `803-805` — latest audit score lookup
- `822-827` — cross-module audit average logic
- `855-864` — audit results tool
- `867-874` — location comparison tool

### `src/lib/auditHelpers.ts`
This already contains the correct completion semantics:
- completed statuses include `completed`, `compliant`, `non-compliant`, `non_compliant`
- score presence can also indicate completion

Dash should align with this logic server-side.

## What is missing today

1. A **single authoritative audit-finished predicate** inside Dash backend  
2. A **single authoritative audit date basis** (`audit_date` for business questions)  
3. A way to **compare all locations without requiring UUIDs from the model**  
4. A regression test suite for audit read tools  
5. Better response semantics for:
   - locations with only scheduled audits
   - locations with no scored audits in the range
   - company-wide comparisons where some locations have no data

## Fix plan

### Phase 1 — Correct the audit semantics in Dash
Add a shared backend helper in `dash-command` for:
- finished statuses = `completed | compliant | non-compliant | non_compliant`
- scored audit = `overall_score is not null` (and optionally > 0, depending on desired semantics)
- business date = `audit_date`

Then refactor all Dash audit read tools to use that helper.

### Phase 2 — Fix each broken tool
#### `get_location_overview`
- use latest **finished/scored** audit
- sort by `audit_date DESC` (fallback `created_at DESC`)
- stop using `completed_at`

#### `get_cross_module_summary`
- keep audit totals explicit
- separately return:
  - total audits in range
  - finished audits in range
  - scheduled audits in range
  - avg score over finished/scored audits
- use `audit_date`

#### `get_audit_results`
- remove `completed_at`
- filter by `audit_date`
- use finished/scored logic
- order by `audit_date DESC`

#### `compare_location_performance`
- make `location_ids` optional
- if omitted, automatically load all active company locations
- compare using `audit_date`
- return:
  - scored locations
  - zero-data locations
  - skipped/scheduled-only locations

### Phase 3 — Make responses operationally honest
Dash should never collapse all failure modes into “no audits”.
It should distinguish:
- no locations found
- locations found but no audits in date range
- only scheduled audits exist
- finished audits exist but none have scores
- query/tool failure

## Validation I would run after implementation

1. “Compare audit scores between all locations this month”  
   Expected: real comparison, not empty. Based on current data, locations like **Apaca, Timpuri Noi, Amzei, Mosilor, Obor, Executive** should appear.

2. “What are the biggest operational issues across all locations in the last 30 days?”  
   Expected: audit average should no longer be “unavailable”.

3. “Show audit results for LBFC Amzei this month”  
   Expected: no `completed_at` failure, real rows returned.

4. “Give me an overview of LBFC Amzei”  
   Expected: latest audit score populated.

5. “Compare audit scores between all locations this month, including locations with no finished audits”  
   Expected: scored locations shown, zero-data locations called out separately.

## Recommended implementation files

- `supabase/functions/dash-command/index.ts`
- add regression tests for Dash read-tool semantics:
  - `supabase/functions/dash-command/*_test.ts`

## Risks still worth noting

1. Dash audit semantics currently drift from the rest of the app; if fixed only in one tool, it will regress elsewhere.
2. The materialized-view layer also has its own audit-status assumptions, so if Dash later reuses those aggregates, the semantics must be reviewed first.
3. Without tests, this exact bug class will reappear: status drift, wrong date column, stale schema references.

## My recommendation

Do not patch only the single compare query.

Do a proper Dash audit-query normalization pass:
- one shared completion helper
- one shared date basis
- one all-locations fallback
- one regression suite

That turns this from a one-off bug fix into a stable audit intelligence layer for Dash.
