

# Wastage Numbers Analysis — What's Wrong

## Findings

I traced the full data flow (form input → database trigger → report aggregation) and queried live data. There are **two distinct bugs**:

---

### Bug 1: `per_unit` Cost Model Ignores Quantity

The database trigger that calculates `cost_total` has this logic:

```sql
IF v_product.cost_model = 'per_kg' THEN
  NEW.cost_total := NEW.weight_kg * v_product.unit_cost;
ELSE
  -- per_unit: fixed cost per unit
  NEW.cost_total := COALESCE(v_product.unit_cost, 0);  -- BUG!
END IF;
```

For `per_unit` items (like Burger Buns at 1.90 RON/piece), it sets cost to **just the unit price** regardless of quantity. Live data confirms: **6 Burger Buns → cost_total = 1.90 RON** instead of the correct 11.40 RON (6 × 1.90).

**Fix**: Change to `NEW.cost_total := NEW.weight_kg * v_product.unit_cost;` — the `weight_kg` column stores the quantity for piece/portion items, so multiplying works correctly.

---

### Bug 2: Report Shows "Total Weight kg" but Data is Mixed Units

The `weight_kg` column stores the **raw quantity in whatever UOM the product uses** — grams, pieces, liters, portions — without converting to kg. The report then sums everything as `SUM(weight_kg)` and labels it "Total Weight (kg)".

Live data examples:
- Strips Cooked (UOM: g) → `weight_kg = 804` (that's 804 grams, displayed as 804.000 g, but summed as 804 "kg")
- Burger Buns (UOM: pcs) → `weight_kg = 6` (6 pieces, summed as 6 "kg")

This makes the **Total Weight 27,495.3 "kg" completely meaningless** — it's a mix of grams, pieces, and liters all added together.

**Fix options**:
- **Option A**: Store a normalized `weight_kg` (convert grams to kg on entry) and keep a separate `quantity_raw` column for display. Report sums actual kg.
- **Option B** (simpler): Change the report KPI from "Total Weight" to show weight-based and count-based totals separately. Don't sum incompatible units.

I'd recommend **Option B** since it doesn't require migrating existing data and is more honest — you can't meaningfully sum kg + pieces + liters.

---

### Bug 3 (Minor): Cost Numbers Are Actually Correct for `per_kg`

Despite the column name `weight_kg`, the `per_kg` cost math works because `unit_cost` is stored in the same unit as the UOM. Example: Strips Cooked has unit_cost = 0.36 (per gram), weight_kg = 804 (grams), cost = 804 × 0.36 = 289.44 ✓. The naming is misleading but the cost is correct for this model.

---

## Proposed Changes

### Migration (SQL)
1. Fix the `compute_waste_entry_cost` trigger: multiply quantity for `per_unit` items
2. Recalculate all existing `per_unit` entries: `UPDATE waste_entries SET cost_total = weight_kg * unit_cost_used WHERE ... cost_model = 'per_unit'`
3. Recalculate affected daily rollups

### Report Function (`get_waste_report`)
- Split the weight KPI: sum only weight-based UOMs (kg, g converted to kg) separately from count-based (pcs, portions) and volume (liters)
- Or rename KPI to "Total Quantity" with mixed-unit caveat

### UI (Report Overview)
- Update KPI card to show separated totals or rename label to avoid confusion

### Files to Change
- **Migration**: Fix trigger + backfill `per_unit` costs + fix rollups
- `get_waste_report` RPC function (in migration): Update KPI aggregation
- Report UI components: Update KPI display labels/logic

