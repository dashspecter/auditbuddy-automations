

# Add Edit & Delete Actions to Waste Report Entries Table

## Current State
- The Entries tab in `WasteReports.tsx` (lines 563-632) shows a read-only table
- `useUpdateWasteEntry` and `useVoidWasteEntry` hooks already exist in `useWaste.ts`
- No delete mutation exists — we'll use void (soft-delete) since the `voided` status pattern is already established

## Changes

### 1. Add Actions column to Entries table (`src/pages/reports/WasteReports.tsx`)
- Add an "Actions" `TableHead` column after "Status"
- Add a dropdown menu (DropdownMenu) per row with "Edit" and "Delete" options
- Import `DropdownMenu`, `MoreHorizontal`, `Pencil`, `Trash2` icons

### 2. Add Edit dialog (`src/pages/reports/WasteReports.tsx`)
- New state: `editDialogOpen`, `editingEntry`, form fields (`editWeight`, `editReason`, `editNotes`)
- Dialog with form fields: weight (number input), reason (select from `reasons`), notes (textarea)
- On save: call `useUpdateWasteEntry` with updated fields, recalculate `cost_total` = weight × product cost_per_kg

### 3. Add Delete confirmation (`src/pages/reports/WasteReports.tsx`)
- Use `AlertDialog` for confirmation with optional void reason input
- On confirm: call `useVoidWasteEntry` which sets `status = 'voided'`
- Entry will disappear from the filtered view since `filters.status = 'recorded'`

### 4. Wire up hooks
- Import `useUpdateWasteEntry`, `useVoidWasteEntry` from `useWaste`
- Both already invalidate the relevant query caches

### No database changes needed
- Update and void mutations already exist
- RLS policies already allow admin/manager updates

