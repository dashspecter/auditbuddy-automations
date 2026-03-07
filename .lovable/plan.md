

# Fix: Unscheduled Clock-In UI + Extra Shift Tagging

Two strictly additive changes across two files. No other files touched.

## Change 1 — Show Clock In button when no shift scheduled

**File:** `src/pages/staff/StaffHome.tsx`

- Import `useWorkforcePolicy` from `@/hooks/useScheduleGovernance`
- Call `const { data: workforcePolicy } = useWorkforcePolicy()` near top of component
- In the "no shift today" card (lines 401-408), add a conditional Clock In button before the Browse Shifts link:

```tsx
{clockInEnabled && workforcePolicy?.unscheduled_clock_in_policy !== 'block' && (
  <Button variant="outline" className="mt-3 w-full" onClick={() => navigate("/staff/scan-attendance")}>
    <QrCode className="h-4 w-4 mr-2" />
    {t('staffHome.clockInQR', 'Clock In')}
  </Button>
)}
```

`QrCode` is already imported (line 10). Navigation target `/staff/scan-attendance` already handles the full unscheduled flow.

## Change 2 — Tag auto-created shift as 'extra'

**File:** `src/hooks/useScheduleGovernance.ts` (line 560-570)

Add `shift_type: 'extra'` to the shift insert object so auto-created shifts from approved unscheduled clock-in exceptions display the orange badge on the schedule grid:

```typescript
.insert({
  company_id: exception.company_id,
  location_id: exception.location_id,
  shift_date: exception.shift_date,
  start_time: startTime,
  end_time: endTime,
  role: employeeRole,
  is_published: true,
  status: 'published',
  shift_type: 'extra',        // ← add this line
  created_by: user.id,
})
```

## Summary

| File | Change | Lines |
|------|--------|-------|
| `src/pages/staff/StaffHome.tsx` | Add `useWorkforcePolicy` + conditional Clock In button | ~8 lines added |
| `src/hooks/useScheduleGovernance.ts` | Add `shift_type: 'extra'` to insert | 1 line added |

No database changes. No other files modified. Both changes are additive — existing behavior is untouched.

