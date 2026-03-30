

# Select Specific Vacation Dates Instead of Date Ranges

## Problem
Currently, employees pick a start date and end date (continuous range). The business requires employees to select **exact individual dates** for their vacation request. This allows non-consecutive days (e.g., March 3, 5, 7) and gives managers clear visibility into which specific days are requested.

## Approach

### Database Change
Create a new child table `time_off_request_dates` that stores individual selected dates per request. Keep `start_date`/`end_date` on the parent table as the min/max of selected dates (for backward compatibility and efficient range queries in payroll/scheduling).

```text
time_off_requests (existing)        time_off_request_dates (new)
┌──────────────────────┐            ┌──────────────────────────┐
│ id                   │◄───────────│ request_id (FK)          │
│ start_date (min)     │            │ date (DATE)              │
│ end_date (max)       │            │ id                       │
│ status, reason, etc. │            │ created_at               │
└──────────────────────┘            └──────────────────────────┘
```

### Migration
- Create `time_off_request_dates` table with `request_id` FK, `date` column, RLS policies mirroring parent table
- Backfill existing approved requests: expand each start_date→end_date range into individual date rows

### Employee Request Flow (StaffTimeOff.tsx)
- Replace start/end date inputs with a **multi-select calendar** (DayPicker `mode="multiple"`)
- Employee taps individual dates on the calendar → selected dates shown as chips/badges below
- On submit: insert parent `time_off_requests` row (start_date = min, end_date = max), then insert individual dates into `time_off_request_dates`

### Manager Approval View (TimeOffApprovals.tsx)
- Pending request cards show the **list of specific dates** requested (fetched from `time_off_request_dates`), not just a range
- Approve/reject flow unchanged — approving updates parent status, which applies to all selected dates

### Admin AddTimeOffDialog (AddTimeOffDialog.tsx)
- Replace start/end date pickers with multi-select calendar
- Same insert pattern: parent row + child date rows

### Downstream Consumers (read selected_dates instead of expanding range)
All places that currently expand start_date→end_date into individual days should instead query `time_off_request_dates`:

1. **Payroll batch details** (`usePayrollBatchDetails.ts`) — instead of `eachDayOfInterval`, query the actual selected dates
2. **Scheduling grid** time-off row — query `time_off_request_dates` for specific off-dates
3. **Balance calculation** (`StaffTimeOff.tsx`) — count rows in `time_off_request_dates` instead of computing date diffs
4. **VacationDetailsDialog** — show actual selected dates

### Staff Mobile View
- Request history cards show individual dates (e.g., "Mar 3, 5, 7") instead of "Mar 3 - Mar 7"
- Declined requests visible with rejection badge (already works)

## Files Modified

| File | Change |
|------|--------|
| **New migration** | Create `time_off_request_dates` table, RLS, backfill existing data |
| `src/pages/staff/StaffTimeOff.tsx` | Multi-select calendar for date picking; insert child rows; display specific dates |
| `src/pages/workforce/TimeOffApprovals.tsx` | Fetch and display specific dates on request cards |
| `src/components/workforce/AddTimeOffDialog.tsx` | Multi-select calendar instead of start/end pickers |
| `src/hooks/useTimeOffRequests.ts` | Update create mutation to insert child date rows |
| `src/hooks/usePayrollBatchDetails.ts` | Query `time_off_request_dates` instead of expanding ranges |
| `src/components/staff/PendingApprovalsSection.tsx` | Show specific dates in pending approval cards |
| `src/components/staff/VacationDetailsDialog.tsx` | Show actual selected dates |
| `src/components/staff/ShiftRequestDialog.tsx` | If used for time-off, update to multi-select |

## Key Design Decisions
- `start_date`/`end_date` remain on parent table as computed min/max for backward compatibility and efficient range queries
- Multi-select calendar uses existing `react-day-picker` with `mode="multiple"` (already available in the project)
- Individual dates are the **source of truth** for day counts — no more range arithmetic

