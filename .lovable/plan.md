

## Analysis: Current Grid Row Structure & Redundancy

Looking at the screenshot and the code, there are currently **three** special rows above the per-employee rows:

1. **"Open Shifts" row** (line 826) — shows ALL open shifts for the day (`is_open_shift === true`), regardless of assignment status
2. **"Draft / Open" row** (line 884) — shows unassigned Draft shifts AND unassigned Open shifts together
3. **"All shifts" row** (line 1218, per-location) — shows all non-open shifts for a location (`!shift.is_open_shift`), including Draft ones with their assignment counts

### The Redundancy Problem

The user is correct — there is clear duplication:

- **Open shifts appear in BOTH** the "Open Shifts" row AND the "Draft / Open" row (the latter via `getOpenShiftsForDayUnassigned`)
- **Draft shifts appear in BOTH** the "Draft / Open" row AND the "All shifts" per-location row (the latter shows them with dashed borders and "Draft" badge)
- The "Open Shifts" row shows open shifts even when they have approved assignments — but then the same shift also appears in "Draft / Open" if it has no approved assignments

### Proposed Simplification: Two Rows Instead of Three

Replace the three overlapping rows with a cleaner two-row model:

| Row | What it shows | Purpose |
|-----|---------------|---------|
| **Draft** (orange, `EyeOff` icon) | Shifts with `status = 'draft'` — not visible to employees | Manager workspace for shifts being prepared before publishing |
| **Open Shifts** (amber, `Calendar` icon) | Shifts with `is_open_shift = true` — visible and claimable by employees | Shows shifts awaiting employee claims, with pending claim indicators |

The **"All shifts"** per-location row would then show only `published` shifts (assigned, visible to employees) — no more drafts duplicated there.

### Code Changes

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

1. **Remove the current "Open Shifts" row** (lines 826-882) — its content moves into the updated dedicated row below

2. **Rename "Draft / Open" row to just "Draft"** — remove Open shifts from this row. Only show `!is_published && !is_open_shift` shifts here (true drafts). Keep the orange dashed styling and "No staff assigned" indicators.

3. **Keep/repurpose the "Open Shifts" row** — show only `is_open_shift === true` shifts (both assigned and unassigned), with the "+ Add" button, pending claim indicators, and "Claimable by role" labels.

4. **Filter drafts OUT of "All shifts" per-location row** — update `getShiftsForLocationAndDay` (line 460-464) to also exclude drafts: `shift.is_published && !shift.is_open_shift` (i.e., only truly published/assigned shifts).

### Result

- **Draft row**: Internal workspace. Shows shifts the manager is preparing. Not visible to employees.
- **Open Shifts row**: Published claimable shifts. Visible to employees in Shift Pool.
- **All shifts (per location)**: Only published, assigned shifts. No duplication.

Each shift appears in exactly ONE row. No redundancy.

