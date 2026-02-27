

# Add Filters to Waste Entries Tab

## Changes (single file: `src/pages/reports/WasteReports.tsx`)

### 1. Add entry-specific filter state
- `entryProductFilter` (select from products list)
- `entryReasonFilter` (select from reasons list)  
- `entryDateFilter` (date input for specific day)
- `entryWeightMin` / `entryWeightMax` (number inputs)
- `entryCostMin` / `entryCostMax` (number inputs)

### 2. Add filter bar above the entries table
- Row of compact filter controls inside the Entries `TabsContent`, between the `CardHeader` and the table
- Product select, Reason select, Weight min/max inputs, Cost min/max inputs
- "Clear filters" button to reset all

### 3. Client-side filtering of entries
- Apply filters to `entries` array using `useMemo` before rendering the table
- Filter by product name match, reason match, weight range, cost range, and date
- This avoids extra server queries since entries are already loaded (max 2000)

### No database changes needed

