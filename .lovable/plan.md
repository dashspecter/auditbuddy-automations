

# Add Clock In/Out for Managers on Mobile Dashboard

## Problem
Managers use the regular dashboard (adapted to mobile via `MobileBottomNav`), not the staff view (`StaffHome`). The clock-in/out buttons only exist in `StaffHome.tsx`. Managers who work on-location have no way to clock in/out from their mobile view.

## Solution
Add a compact **Clock In/Out card** to the mobile dashboard view. When a manager is on mobile and has an employee profile (meaning they're also assigned as staff at a location), show a small attendance card at the top of the dashboard with QR scan clock-in/out functionality.

## How It Works

1. **Create a new component**: `ManagerClockInCard` — a compact card that:
   - Checks if the current user has an `employees` record (meaning they work at a location)
   - Fetches their today's shift assignment and attendance log (same logic as `StaffHome`)
   - Shows current status: "Not clocked in" / "Clocked in at HH:MM" / "Shift completed"
   - Has a single QR scan button that navigates to `/staff/scan-attendance`
   - Only renders on mobile (`useIsMobile()`)

2. **Add it to the Dashboard page** (`src/pages/Dashboard.tsx`):
   - Import and render `<ManagerClockInCard />` above the existing dashboard content
   - The component self-hides if the user has no employee record or if on desktop

3. **No routing changes needed** — `/staff/scan-attendance` is already a `ProtectedRoute` accessible to any authenticated user

## Files

| File | Change |
|------|--------|
| `src/components/dashboard/ManagerClockInCard.tsx` | **New** — compact attendance card with QR scan button |
| `src/pages/Dashboard.tsx` | Add `<ManagerClockInCard />` at top of page content |

## UI Design
- Small card with gradient accent, showing location name, shift time, and status
- Single prominent "Scan QR to Clock In" / "Scan QR to Clock Out" button
- Automatically hidden on desktop and for users without employee profiles
- Matches existing mobile dashboard styling

