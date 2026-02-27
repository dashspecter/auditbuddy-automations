

# Add UOM (Unit of Measure) Selection to Waste Products

## Current State
- The `waste_products` table already has `uom` and `cost_model` columns
- The DB trigger `compute_waste_entry_cost` already handles `per_kg` (multiply weight × cost) vs `per_unit` (fixed cost per piece)
- But the WasteProducts admin form **hardcodes** `uom: 'g'` and `cost_model: 'per_kg'` — no way to change it
- Entry forms always show "Weight (kg)" regardless of product UOM

## Changes

### 1. `src/pages/admin/waste/WasteProducts.tsx` — Add UOM + cost model to product form
- Add `uom` field to form state with options: `kg`, `g`, `pcs` (pieces), `l` (liters), `portions`
- Add `cost_model` field: `per_kg` (cost × quantity) or `per_unit` (fixed cost per piece)
- When UOM is `pcs` or `portions`, auto-set `cost_model` to `per_unit`; when `kg`/`g`/`l`, default to `per_kg`
- Update the table to show UOM column instead of hardcoded "Cost/kg" — show "Cost/kg", "Cost/unit", "Cost/L" dynamically
- Pass `uom` and `cost_model` through to create/update mutations

### 2. `src/pages/admin/waste/AdminAddWasteEntry.tsx` — Dynamic quantity label
- When a product is selected, read its `uom` to show the correct label:
  - `kg` → "Weight (kg)" with gram conversion tooltip
  - `g` → "Weight (g)"
  - `pcs` → "Quantity (pieces)"
  - `l` → "Volume (liters)"
  - `portions` → "Quantity (portions)"
- The field name stays `weight_kg` in the DB (it's the quantity field regardless of unit)
- Estimated cost formula adapts: `per_kg` → quantity × unit_cost, `per_unit` → count × unit_cost

### 3. `src/pages/staff/AddWasteEntry.tsx` — Same dynamic label for staff form
- Mirror the same UOM-aware label and placeholder changes as the admin form
- Products query already fetches `uom`, just needs to be used in the UI

### 4. `src/hooks/useWaste.ts` — Include `uom` and `cost_model` in product fetches
- Already fetching these fields — no changes needed to the hook
- The `useWasteProducts` query already returns full product rows including `uom` and `cost_model`

### 5. Display in reports — `src/pages/reports/WasteReports.tsx` and `src/pages/admin/waste/AdminWasteEntries.tsx`
- Show the product's UOM next to the quantity value instead of hardcoded "kg"
- Requires joining `waste_products.uom` which is already included in the entry query's select

### No database changes needed
The `uom` and `cost_model` columns already exist. The DB trigger already handles both cost models. This is purely a UI update to expose the existing functionality.

