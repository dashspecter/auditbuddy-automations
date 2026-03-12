

# Terminology Consistency Fix for Government Institution Module

## Problem
When a government institution views the Workforce module, they see hardcoded restaurant/generic terms like "Staff", "Employees", "Locations", "Chef, Server, Manager" instead of their configured overrides ("Civil Servants", "Departments", etc.). The `useLabels` hook exists but isn't used in most workforce components.

## Approach
Create a reusable terminology helper hook, then integrate it into all affected components. Non-government companies see no change (defaults remain).

## Implementation

### 1. Create `src/hooks/useTerminology.ts`
A thin wrapper around `useLabels` returning common singular/plural terms:
- `employee` / `employees` (→ "Civil Servant" / "Civil Servants")
- `location` / `locations` (→ "Department" / "Departments")
- `shift` / `shifts`
- `company`

### 2. Fix `Staff.tsx` (~6 string replacements)
- Capacity badge: `employees` → terminology
- Alert title/description: "Employee limit reached" → terminology-aware
- Button labels and page title already use i18n keys but the i18n defaults are wrong — will use terminology hook to override at render time
- Job titles info box: replace "Chef, Server, Manager" with generic "e.g., Analyst, Coordinator, Director"

### 3. Fix `EmployeeDialog.tsx` (~15 string replacements)
- Dialog title: "Add Employee" / "Edit Employee"
- "Primary Location" / "Additional Locations" labels
- "Select primary location" placeholder
- "Manage Roles" button
- "Create login account for employee" checkbox
- "Allow this employee to log in..." description
- Login account status text
- "Enter password for employee login" placeholder
- "Add an email address to enable login account creation"
- Submit button: "Add Employee" / "Update Employee"
- Toast messages (3 instances)

### 4. Fix `RoleManagementDialog.tsx` (~4 replacements)
- Title: "Manage Employee Roles"
- Description: "Create and manage custom roles for your employees"
- Placeholder: "e.g., Server, Manager" → "e.g., Analyst, Coordinator"
- Delete warning: "Employees with this role will need to be reassigned"

### 5. Fix `ContractTemplateDialog.tsx` (~1 replacement)
- Description: "Manage your contract templates for employee contracts"

### 6. Fix `StaffTable.tsx` — i18n keys already used
The StaffTable uses i18n keys like `staffTable.allLocations`, `staffTable.location`, `staffTable.loadingStaff`, `staffTable.noStaffFound`. These resolve from `en.json`. Two options:
- Option A: Override at component level using terminology hook
- Option B: Keep i18n defaults generic
Will use Option A for location-related labels; staff-related labels will stay generic since the i18n key structure handles it.

### 7. Fix `WorkforceGuides.tsx` — full text rewrite
All guide text is hardcoded with restaurant terminology. Will make it use the terminology hook:
- "Staff Members" → `employees` label
- "Chef, Server, Manager" → generic examples
- "Kitchen, Service, Management" → generic
- "Add Staff Member" → `Add ${employee}`
- "hourly rate" stays (universal)

### 8. Update i18n `en.json` defaults
Make default values more generic where they currently say "Chef, Server, Manager":
- `workforce.staff.jobTitlesDescription` — replace restaurant examples
- `workforce.staff.manageRoles` — "Manage Roles" (drop "Employee")

### Files Modified
| File | Changes |
|---|---|
| **New:** `src/hooks/useTerminology.ts` | Centralized helper |
| `src/pages/workforce/Staff.tsx` | ~6 replacements |
| `src/components/EmployeeDialog.tsx` | ~15 replacements |
| `src/components/workforce/RoleManagementDialog.tsx` | ~4 replacements |
| `src/components/ContractTemplateDialog.tsx` | ~1 replacement |
| `src/components/workforce/StaffTable.tsx` | ~3 replacements (location labels) |
| `src/components/workforce/WorkforceGuides.tsx` | Full text terminology-aware rewrite |
| `src/i18n/locales/en.json` | Update generic defaults |
| `src/i18n/locales/ro.json` | Matching updates |

### Impact
- **Government institutions**: See "Civil Servants", "Departments", etc. everywhere consistently
- **All other companies**: See the same defaults as before — zero visual change

