

# Time Off Requests — Access & Approval Audit

## Current State

### Who can see/manage time off requests?

**Backend (RLS)** — correctly allows:
- The employee who owns the request (SELECT, INSERT pending, DELETE own pending)
- `company_owner` / `company_admin` (full CRUD)
- Platform `admin` / `manager` roles (SELECT, INSERT, UPDATE, DELETE)

**Frontend navigation** — problem found:
- **Sidebar**: Time Off (`/workforce/time-off`) is restricted to `['admin', 'hr']` only. **Managers are excluded** from seeing the nav item.
- **Route guard**: `/workforce/time-off` uses `<ManagerRoute requiredPermission="manage_employees">`, which managers CAN access — so if they type the URL manually they'd see it. But there's no sidebar link.
- **Mobile bottom nav (MobileBottomNav)**: No time-off link at all for owner/admin/manager. The main items are Home, Workforce, Audits, Equipment + More sheet. The "More" sheet doesn't include Time Off either.
- **Staff bottom nav (StaffBottomNav)**: Both staff and manager variants have a "Time Off" link → `/staff/time-off`. But this goes to `StaffTimeOff` (employee self-service view to submit requests), NOT the approval page.

### Pages that exist

| Page | Route | Purpose | Who sees it |
|------|-------|---------|-------------|
| `TimeOffApprovals` | `/workforce/time-off` | Approve/reject requests | Admin, HR (sidebar); Manager can access via URL |
| `StaffTimeOff` | `/staff/time-off` | Employee submits own requests | All staff/managers in staff view |
| `AddTimeOffDialog` | Dialog (used in shifts calendar) | Manager adds time off for employee | Managers |

### Problems to fix

1. **Navigation gap**: `'manager'` role missing from `allowedRoles` for the Time Off sidebar item in both `navigation.ts` and `navigationConfig.ts`
2. **Mobile bottom nav**: No path for managers/owners to reach the approvals page on mobile
3. **Staff manager view**: When a manager is on `/staff/time-off`, they see the employee self-service view, not the approval view — they should see pending requests to approve

## Implementation Plan

### A. Fix sidebar navigation — add `'manager'` role to Time Off

**Files**: `src/config/navigation.ts` (line 141), `src/config/navigationConfig.ts` (line 94)

Change `allowedRoles: ['admin', 'hr']` → `allowedRoles: ['admin', 'manager', 'hr']`

This gives managers access to `/workforce/time-off` (the approvals page) on desktop sidebar and mobile "More" sheet (via Workforce sub-items).

### B. Enhance StaffTimeOff for managers — show pending approval requests

**File**: `src/pages/staff/StaffTimeOff.tsx`

For managers (detected via `useUserRole`), add a "Pending Approvals" section at the top showing company-wide pending requests with approve/reject actions. This reuses the same approve/reject logic from `TimeOffApprovals`. Below it, the manager's own time-off balance and request form remain.

This ensures managers on the `/staff/time-off` route (reachable from staff bottom nav) can see and act on requests.

### C. No database or RLS changes needed

RLS already grants managers full access. The gap is purely in frontend navigation and UI.

### What stays unchanged
- Desktop dashboard layout
- Staff self-service request flow
- All other role flows
- Database schema and RLS policies

