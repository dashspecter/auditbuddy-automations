

# Two Bugs Found in Dashboard Analytics

## Bug 1: Weakest Operational Areas — Wrong Percentages (4%, 5%)

**Root cause**: The `recompute_audit_section_scores` DB function computes `total_score` as an AVG across fields, but treats rating fields (1-5 scale) and yes/no fields (0 or 100) differently:
- Rating fields: `AVG(raw_value)` → produces values like 4, 5 (on a 1-5 scale)
- Yes/No fields: `AVG(0 or 100)` → produces values like 67, 100 (already 0-100%)

The frontend (`buildSectionPerformance`) displays `total_score` directly as a percentage. So rating-based sections show "4%" instead of "80%" (4/5 × 100).

**Data proof**: Deposit section has `total_score: 4` with `scored_fields: 3` — all rating fields scored ~4 out of 5. That's 80%, not 4%.

**Fix**: Update the DB function to normalize rating fields to 0-100 scale: `(rating / 5.0) * 100`. Then backfill all cached scores. No frontend changes needed.

```sql
-- In recompute_audit_section_scores, change:
WHEN af.field_type = 'rating' THEN (afr.response_value::text)::numeric
-- To:
WHEN af.field_type = 'rating' THEN ((afr.response_value::text)::numeric / 5.0) * 100
```

Then re-run the backfill loop to update all existing cached scores.

---

## Bug 2: Declining Locations — Ignores Date Picker

**Root cause**: `usePerformanceTrends` computes `locationPerformance` from ALL audits (line 118-176 uses raw `audits` from `useLocationAudits()`). The `filteredAudits` variable (line 96-106) correctly applies dateFrom/dateTo filters but is **never used** — it's a dead variable.

So "Declining Locations" always shows all-time trends regardless of the dashboard date picker (Last 7 days, etc.).

**Fix**: In `usePerformanceTrends.ts`, change `locationPerformance` to use `filteredAudits` instead of `audits`. One line change in the memo.

---

## Summary of Changes

| What | Where | Type |
|------|-------|------|
| Normalize rating scores to 0-100 | DB function `recompute_audit_section_scores` | Migration |
| Backfill all cached section scores | One-time migration | Migration |
| Use `filteredAudits` in `locationPerformance` | `src/hooks/usePerformanceTrends.ts` line 122 | Code |

