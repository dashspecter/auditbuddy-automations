

# Fix: HR Role Users Incorrectly Routed to Staff View

## Problem
The `checkStaffStatus` function in `AuthContext.tsx` only excludes `admin` and `manager` platform roles from being classified as staff. The `hr` role is not in that list, so HR users who also have an employee record get `isStaff = true` and are redirected to the mobile staff view instead of the dashboard.

## Fix

### Single change in `src/contexts/AuthContext.tsx` (line 137)

Change the platform role exclusion check from:
```typescript
.in('role', ['admin', 'manager'])
```
to:
```typescript
.in('role', ['admin', 'manager', 'hr'])
```

This ensures that users with the `hr` platform role are treated as dashboard users, not staff — matching the same treatment as `admin` and `manager`.

### Why `checker` is NOT added
The existing comment on line 149 says "checker can still be staff" — this is intentional. Checkers are field auditors who use the mobile view. HR users need the full dashboard to access Workforce, Time Off, Payroll, etc.

### No other files need changes
- `ProtectedRoute.tsx` already handles routing correctly once `isStaff` is correct
- `Index.tsx` redirect logic is correct
- Navigation resolver already shows HR-appropriate menu items

