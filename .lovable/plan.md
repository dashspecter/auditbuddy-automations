

# Wastage Prices Bug — Root Cause Analysis & Fix Plan

## The Problem: Two Incompatible Data Eras

The waste_entries table has **140 entries using an old convention** that conflicts with the current one. Here's what happened:

1. **Originally**: `weight_g` stored grams, `unit_cost` was per-kg. Trigger did `(weight_g / 1000) * unit_cost` = correct RON.
2. **Feb 2 migration**: Renamed `weight_g` → `weight_kg` and **divided all values by 1000**. So 3772g became 3.772. Trigger changed to `weight_kg * unit_cost` = still correct.
3. **After migration**: Product prices were changed from per-kg to per-gram (e.g., Cooked Chicken: 20 → 0.2). New entries store **raw gram values** as `weight_kg` (e.g., 804 for 804 grams).

This created two incompatible data sets in the same column:

```text
OLD entries (140):   weight_kg = 3.772 (actually kg), unit_cost_used = 20 (per kg)
                     cost = 3.772 × 20 = 75.44 RON ✓

NEW entries (95):    weight_kg = 804 (actually grams), unit_cost_used = 0.36 (per gram)
                     cost = 804 × 0.36 = 289.44 RON ✓
```

**Both cost_totals are correct**, but the **weight_kg values are incompatible** — some are kg, some are grams.

## Impact on the Report

- **Total Weight (26.9 kg)**: Wrong. Old entries' kg values get divided by 1000 AGAIN in the normalization query (`e.weight_kg / 1000`), turning 3.772 kg into 0.003772 kg.
- **Total Cost (10,100 RON)**: Technically correct (each entry's cost is internally consistent), but inflated by old entries with stale pricing.
- **Entries list**: Old entries show e.g. "3.772 g" at 75.44 RON, which looks absurd.

## Fix: Normalize Old Entries to Current Convention

Backfill the 140 old entries to match the current "grams + per-gram" convention:

- **Multiply `weight_kg` by 1000** (convert kg back to grams)
- **Divide `unit_cost_used` by 1000** (convert per-kg to per-gram)
- **`cost_total` stays unchanged** because (weight × 1000) × (price / 1000) = same value

This makes all entries use the same convention: weight_kg stores raw grams for g-UOM products, unit_cost_used is per-gram.

### Identifying old entries
Entries where `unit_cost_used / current_product.unit_cost ≈ 100` are old-convention entries. More precisely: entries where `unit_cost_used > product.unit_cost * 10` for g-UOM products.

### Data fix (via insert/update tool, not migration)
```sql
UPDATE waste_entries e
SET weight_kg = e.weight_kg * 1000,
    unit_cost_used = e.unit_cost_used / 1000
FROM waste_products p
WHERE e.waste_product_id = p.id
  AND p.uom = 'g'
  AND e.unit_cost_used > p.unit_cost * 10
  AND e.status = 'recorded';
```

### Rebuild daily rollups
After the backfill, truncate and rebuild `waste_daily_rollups` from scratch.

### No code changes needed
The trigger, report RPC, and UI code are all correct for the current convention. Only the stale data needs fixing.

## Files/Systems Affected
- **Database data**: `waste_entries` (140 rows), `waste_daily_rollups` (rebuild)
- **No code changes** — the trigger and report functions work correctly once data is consistent

