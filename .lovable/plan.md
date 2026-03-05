

# Company Owner Setup Checklist

## What

A "Company Setup" checklist card shown at the top of the Dashboard for company owners/admins when their company is new and incomplete. It guides them through the essential first steps in the correct order, with live progress tracking. Once all steps are done (or dismissed), it disappears.

## Design

A single card with numbered steps, each showing completion status (checkmark or circle), a title, a short description, and a direct action link. Steps are ordered by dependency:

```text
┌──────────────────────────────────────────────────┐
│  🚀 Set Up Your Company                    [X]   │
│  Complete these steps to get started         2/5  │
│  ━━━━━━━━━━━━━━━░░░░░░░░░░░░░ 40%               │
│                                                   │
│  ✅ 1. Create your first location                 │
│     Add a location to start auditing              │
│                                                   │
│  ✅ 2. Invite team members                        │
│     Add users in Company Settings                 │
│                                                   │
│  ○  3. Add your staff / employees                 │
│     Register employees at your locations   [Add →]│
│                                                   │
│  ○  4. Create an audit template                   │
│     Set up your first inspection checklist [Add →]│
│                                                   │
│  ○  5. Run your first audit                       │
│     Start an audit at one of your locations[Go →] │
└──────────────────────────────────────────────────┘
```

Dismissible via the X button (persists to localStorage). Only shows for `company_owner` or `company_admin` roles.

## Steps & Completion Logic

Each step checks live data (no extra API calls — reuses existing queries):

1. **Add a Location** — `useLocations()` returns at least 1 result → link to `/locations`
2. **Invite Team Members** — query `company_users` count > 1 (more than just the owner) → link to `/company-settings` (users tab)
3. **Add Employees** — `useEmployees()` returns at least 1 → link to `/employees`
4. **Create an Audit Template** — query `audit_templates` count > 0 → link to `/audit-templates`
5. **Complete Your First Audit** — `useLocationAudits()` has at least 1 completed audit → link to `/audits`

## Changes

1. **New component**: `src/components/dashboard/CompanySetupChecklist.tsx`
   - Fetches locations, company_users count, employees, audit_templates count, completed audits
   - Renders the checklist card with progress bar
   - Dismissible via localStorage key `dashspect_setup_checklist_dismissed`
   - Only renders when user is company_owner or company_admin

2. **Edit**: `src/components/dashboard/AdminDashboard.tsx`
   - Import and render `<CompanySetupChecklist />` between the greeting and the attention bar
   - No other changes

3. **Edit**: `src/components/dashboard/ManagerDashboard.tsx`
   - Same: add `<CompanySetupChecklist />` for company_admin users who land on this dashboard

