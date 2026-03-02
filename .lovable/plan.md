

# Partial Shift Detection in Payroll Summary

## Problem
Serdar worked 1.8h of a ~7h shift (left early, sick) but the payroll summary shows it as a full green "1" worked shift — identical to someone who completed their entire shift. This hides critical payroll information.

## Approach: Introduce "Partial Shift" Classification

A shift is **partial** when `actual_hours < 75% of scheduled_hours`. These get:
- An **amber/yellow badge** instead of green in the "Worked" column
- A separate **"Partial Shifts"** section in the expanded details row
- The "Worked" column shows both counts: e.g., full shifts in green + partial in amber

### File 1: `src/hooks/usePayroll.ts`

**PayrollSummaryItem interface** — add:
```typescript
partial_dates: string[];  // Dates where actual < 75% of scheduled
```

**DailyPayrollEntry** — add:
```typescript
is_partial: boolean;
```

**usePayrollFromShifts** (~line 240-276) — after determining `isMissed`, detect partial:
```typescript
const isPartial = !isFutureShift && !isMissed && attendanceLog && actualHours > 0 
  && actualHours < (scheduledHours * 0.75);
```

**usePayrollSummary** (~line 298-350) — split `wasWorked` into full vs partial:
- If partial → add to `partial_dates` instead of `worked_dates`
- Adjust `days_worked` to only count full shifts (or keep total and add `partial_count`)

### File 2: `src/pages/workforce/Payroll.tsx`

**Worked column** (~line 414-418) — show split badges:
```
[3 green] [1 amber]  ← 3 full + 1 partial
```

**Expanded details** (~line 478-494) — add a "Partial Shifts" section with amber styling between Worked and Missed, showing dates + actual hours.

### Threshold
75% is a reasonable default — a 7h shift with 1.8h worked (25%) is clearly partial. Someone leaving 30min early from an 8h shift (93%) would still count as full.

## Scope
2 files: `src/hooks/usePayroll.ts` (data model + classification), `src/pages/workforce/Payroll.tsx` (display).

