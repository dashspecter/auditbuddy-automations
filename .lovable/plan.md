

## Add Badge Settings to Workforce Navigation

### Problem
The Badge Settings panel (where you can adjust thresholds, toggle badges, and create custom ones) is currently only accessible inside individual employee performance pages (`/workforce/performance/:employeeId`). There is no direct link in the sidebar to manage badge configurations.

### Solution
Add a dedicated "Badge Settings" page accessible from the Workforce sidebar, so admins can manage badge thresholds and configurations without navigating to a specific employee first.

### Changes

**1. Create a new page: `src/pages/workforce/BadgeSettings.tsx`**
- A simple wrapper page that renders the existing `BadgeManagement` component
- Includes a page header with title and description
- Protected behind admin/manager role access

**2. Update navigation config: `src/config/navigation.ts`**
- Add a new sub-item under the Workforce section:
  - ID: `workforce-badge-settings`
  - Title: "Badge Settings"
  - URL: `/workforce/badge-settings`
  - Restricted to `admin` and `manager` roles

**3. Update router: `src/App.tsx`**
- Add a new route `/workforce/badge-settings` pointing to the new `BadgeSettings` page
- Wrapped in `ManagerRoute` with `manage_employees` permission

**4. Update navigation config: `src/config/navigationConfig.ts`**
- Mirror the same sub-item addition if this file is also used for navigation rendering

### Technical Details
- No new components needed -- the existing `BadgeManagement` component already handles all badge CRUD operations
- The per-employee performance page will continue to work as-is
- Badge Settings will appear between "Payroll" and any other items at the bottom of the Workforce sub-menu
