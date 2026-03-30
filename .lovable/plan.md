

# Add Edit and Revoke Actions for Approved Time-Off Requests

## Problem
Admins/managers cannot modify approved vacation days. The only option is to delete from the schedule grid, with no way to edit dates or formally revoke a request.

## Solution
Add two actions to approved requests in the **History tab** of the Time Off Approvals page (`/workforce/time-off`):

1. **Edit Dates** — Opens a dialog to change start/end dates on an approved request, keeping the same record
2. **Revoke** — Changes status back to "cancelled", effectively removing the vacation days

## Changes

### File: `src/pages/workforce/TimeOffApprovals.tsx`

**History tab cards for approved requests** — Add two action buttons:
- **Edit** (pencil icon): Opens a dialog with date pickers for start/end date, pre-filled with current values. On save, updates the record via `supabase.update()` and reloads.
- **Revoke** (undo icon): Opens a confirmation dialog. On confirm, sets `status = 'cancelled'` and reloads.

**New state:**
- `editDialogOpen`, `editingRequest`, `editStartDate`, `editEndDate` for the edit flow
- `revokeDialogOpen`, `revokingRequest` for the revoke confirmation

**Edit dialog:** Two date inputs (start, end) with validation that end >= start. Submit updates `start_date`, `end_date` on the existing record.

**Revoke dialog:** Simple confirmation with employee name and date range shown. Submit sets `status = 'cancelled'`.

Both actions are only shown on cards with `status === 'approved'` in the history tab.

### File: `src/hooks/useTimeOffRequests.ts`

No changes needed — the existing `useUpdateTimeOffRequest` hook already supports updating any fields including dates and status.

## Scope

| File | Change |
|------|--------|
| `src/pages/workforce/TimeOffApprovals.tsx` | Add Edit Dates dialog, Revoke confirmation dialog, and action buttons on approved history cards |

## UI Behavior

- History tab shows approved requests with "Edit" and "Revoke" buttons (right-aligned, small)
- Edit opens a dialog with date pickers pre-filled → save updates dates → success toast → list refreshes
- Revoke opens confirmation → confirm sets status to "cancelled" → success toast → list refreshes
- Rejected requests show no action buttons (read-only)

