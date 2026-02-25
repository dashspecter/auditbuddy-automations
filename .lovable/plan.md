

## Problem

In the Draft shift card rendering (lines 859-883 of `EnhancedShiftWeekView.tsx`), the code only looks for `pendingAssignments`. Approved assignments are completely ignored:

```typescript
const pendingAssignments = (shift.shift_assignments || []).filter((a: any) => a.approval_status === 'pending');
if (pendingAssignments.length > 0) {
  // render pending names
}
return (
  // "No staff assigned" — always shows if no pending assignments, even if approved ones exist
);
```

When a manager assigns an employee directly, the assignment is auto-approved (`approval_status: 'approved'`). Since the code never checks for approved assignments, it always shows "No staff assigned".

## Fix

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`** (lines 859-883)

Update the draft shift card IIFE to also render approved assignments:

1. Extract both `approvedAssignments` and `pendingAssignments` from `shift.shift_assignments`
2. Render approved assignments first (with a green/neutral style showing the employee name)
3. Render pending assignments below (existing amber style)
4. Only show "No staff assigned" if both arrays are empty

```typescript
{(() => {
  const assignments = shift.shift_assignments || [];
  const approvedAssignments = assignments.filter((a: any) => a.approval_status === 'approved');
  const pendingAssignments = assignments.filter((a: any) => a.approval_status === 'pending');
  
  if (approvedAssignments.length === 0 && pendingAssignments.length === 0) {
    return (
      <div className="text-[10px] text-orange-600 ...">
        <UserCheck /> No staff assigned
      </div>
    );
  }
  
  return (
    <div className="mt-1 space-y-0.5">
      {approvedAssignments.map((a) => {
        const emp = employees.find(e => e.id === a.staff_id);
        return <div>✓ {emp?.full_name}</div>;
      })}
      {pendingAssignments.map((a) => {
        const emp = employees.find(e => e.id === a.staff_id);
        return <div>⏳ {emp?.full_name} – Pending</div>;
      })}
    </div>
  );
})()}
```

This is a display-only fix — no backend or data changes needed. The assignment data is already present in `shift.shift_assignments`; it's just not being rendered.

