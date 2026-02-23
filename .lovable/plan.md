

## Fix: "Start Audit" Button Does Nothing for Recurring Schedule Events

### Problem

Recurring schedule events on the calendar use virtual IDs like `recurring-schedule-{uuid}-{index}` with `source: 'location_audits'`. When clicking "Start Audit", the code falls into the `else` branch (line 385) and tries to update a non-existent `location_audits` row with that fake ID. The update silently fails -- no try/catch exists -- so nothing happens.

### Changes

#### 1. `src/pages/AuditsCalendar.tsx` -- Fix `handleStartAudit`

Add a new condition before the default `updateStatus` call:
- Detect IDs starting with `recurring-schedule-`
- Extract the schedule UUID from the ID
- Navigate to `/location-audit?recurring_schedule={scheduleId}`
- Wrap the existing `updateStatus` call in try/catch with timeout retry (same pattern used in audit submit fix)
- Add loading state to the button

#### 2. `src/pages/LocationAudit.tsx` -- Handle `?recurring_schedule=` param

Add a `loadRecurringSchedule` function (mirrors existing `loadScheduledAudit` pattern):
- Read `recurring_schedule` from search params
- Fetch from `recurring_audit_schedules` table by ID
- Pre-fill template_id, location_id, and audit date
- Show info toast with location name

Wire it into the existing `initializeData` useEffect alongside the `scheduledAuditId` and `draftId` checks.

### What This Does NOT Change

- No database changes
- No changes to scoring, templates, or audit flow
- No changes to how real `location_audits` or `scheduled_audits` are handled
- The recurring schedule row itself is not modified -- a new audit is simply created from its data

### Technical Detail

**AuditsCalendar.tsx `handleStartAudit` updated flow:**
```
1. source === 'scheduled_audits'  -> navigate ?scheduled=  (unchanged)
2. ID starts with 'recurring-schedule-' -> navigate ?recurring_schedule=  (NEW)
3. else (real location_audits row) -> try/catch updateStatus + navigate ?draft=  (wrapped with error handling)
```

**LocationAudit.tsx new `loadRecurringSchedule` function:**
- Fetches from `recurring_audit_schedules` with location join
- Sets template_id, location_id, audit date
- Same pattern as `loadScheduledAudit` (lines 212-245)

