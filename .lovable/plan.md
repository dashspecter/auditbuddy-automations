

## Hide Labor Cost Section When Payroll Module Is Off

### Problem
The Labor Cost row at the bottom of the shift scheduling grid (showing cost in Lei, percentage, and hours) is visible even when the Payroll module is not activated. This exposes money-related information that isn't relevant when payroll features are disabled.

### Solution
Wrap the Labor Cost Summary section with a module check. If the `payroll` module (or whichever module name controls payroll features) is not active, the entire labor cost row will be hidden.

### Changes

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

1. Import `useCompanyContext` from `@/contexts/CompanyContext`
2. Call `const { hasModule } = useCompanyContext()` inside the component
3. Wrap the "Labor Cost Summary" section (lines 1302-1342) with a conditional: only render when the payroll module is active

The labor cost data fetching (`useLaborCosts`) and calculation function will remain in place (they're lightweight and won't cause errors), but the UI section simply won't render.

### What Changes for Users
- **Payroll module ON**: Labor cost row appears as it does today (no change)
- **Payroll module OFF**: Labor cost row is completely hidden -- clean schedule view with no money-related info
- No impact on any other part of the scheduling view
