

# Fix: Payroll Vacation Days — Deduplicate Overlapping Approved Requests

## Confirmed Business Rule

Vacation days are **only** counted from the approved time-off request flow: Employee requests → Manager approves. The query already correctly filters `status = "approved"`. No other source of vacation days exists.

## The Bug

When an employee has **two overlapping approved requests** (e.g., Mar 20–Apr 1 and Mar 23–Apr 1), the current code sums each request's days independently, double-counting the overlap. Razvan Parvan shows 21 days instead of the correct 12.

## Fix — One File Change

**File: `src/hooks/usePayrollBatchDetails.ts`** (lines 356-365)

Replace the naive per-request day counter with a `Set<string>` that collects unique calendar dates, eliminating any overlap:

```typescript
// Time-off days — deduplicate overlapping approved requests
const vacationDateSet = new Set<string>();
const medicalDateSet = new Set<string>();

for (const req of empTimeOff) {
  const start = parseISO(req.start_date) < parseISO(periodStart) 
    ? parseISO(periodStart) : parseISO(req.start_date);
  const end = parseISO(req.end_date) > parseISO(periodEnd) 
    ? parseISO(periodEnd) : parseISO(req.end_date);

  for (const day of eachDayOfInterval({ start, end })) {
    const key = format(day, 'yyyy-MM-dd');
    if (req.request_type === "vacation" || req.request_type === "annual_leave") {
      vacationDateSet.add(key);
    } else if (req.request_type === "medical" || req.request_type === "sick_leave") {
      medicalDateSet.add(key);
    }
  }
}

const vacationDays = vacationDateSet.size;
const medicalDays = medicalDateSet.size;
```

## Expected Results After Fix

| Employee | Before (wrong) | After (correct) |
|----------|----------------|-----------------|
| Razvan Parvan | 21 | 12 |
| Grecea Alexandru | 7 | 7 (no overlap, unchanged) |
| Gabriela Mitan | 1 | 1 (unchanged) |

## Scope

| File | Change |
|------|--------|
| `src/hooks/usePayrollBatchDetails.ts` | Deduplicate overlapping date ranges using Set |

**Note**: Weekends (Sat/Sun) are currently included in the count. This matches the business rule as stated — if the approved request spans a weekend, those days count. If you want weekends excluded, that's a separate decision.

