

# Replace "Total Quantity" KPI with Meaningful Metrics

## Problem
The "Total Quantity: 27,495.3" KPI is meaningless — it sums 804 grams + 6 pieces + 2.5 liters into one number. Users can't interpret it.

## Approach
Replace the single "Total Quantity" card with **"Total Weight"** that only sums weight-based items (kg and g, normalized to kg). Add a second line showing count-based items (pcs/portions) separately. This gives managers an honest, useful metric.

## Changes

### 1. Database: Update `get_waste_report` RPC
Add two new KPI fields computed in the SQL:
- `total_weight_kg_normalized`: `SUM(CASE WHEN p.uom = 'g' THEN e.weight_kg / 1000 WHEN p.uom IN ('kg','l') THEN e.weight_kg ELSE 0 END)`
- `total_items_count`: `SUM(CASE WHEN p.uom IN ('pcs','portions') THEN e.weight_kg ELSE 0 END)`

Keep `total_weight_kg` (raw sum) for backward compatibility in exports/PDF.

### 2. TypeScript: Update `WasteReportKPIs` interface
Add `total_weight_kg_normalized` and `total_items_count` fields to the interface in `src/hooks/useWaste.ts`.

### 3. UI: Update KPI card in `src/pages/reports/WasteReports.tsx`
Replace the "Total Quantity" card:
- **Label**: "Total Weight" 
- **Value**: `XX.X kg` (from normalized field)
- **Subtext**: `+ YY pcs/portions` (if any count-based items exist)

Also update the Products table column header and trend chart labels from "Weight (kg)" to "Quantity" where raw values are shown, and to "Weight (kg)" where normalized values are used.

### Files
- **Migration SQL**: Update `get_waste_report` function to compute normalized weight and item count
- **`src/hooks/useWaste.ts`**: Add new fields to `WasteReportKPIs`
- **`src/pages/reports/WasteReports.tsx`**: Update KPI card display, PDF export labels

