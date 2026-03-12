

# Government Institution: Complete Audit and Fix Plan

## Root Cause Found

The data migration that was supposed to activate companion modules set them all to **`is_active = false`**. Only `government_ops` itself is active. This is why the sidebar is nearly empty — Workforce, Audits, Documents, Equipment, etc. are all disabled.

## Full Issue List

### 1. DATA FIX — Activate companion modules (Critical)
All 13 companion modules currently have `is_active = false`. Run a migration to set them to `true`:
- `location_audits`, `staff_performance`, `equipment_management`, `workforce`, `operations`, `corrective_actions`, `documents`, `notifications`, `reports`, `insights`, `inventory`, `integrations`, `qr_forms`

### 2. NAVIGATION — Items that should NOT appear for Government
These items are irrelevant/confusing for a government institution and should be hidden when `government_ops` is active:

| Item | Why hide | Solution |
|------|----------|----------|
| **Locations** (with "General", "Sales") | Government uses "Departments", not locations with sales data | Rename via terminology OR hide Sales sub-item when government |
| **Template Marketplace** | Not relevant for government institutions | Gate behind `government_ops` being OFF, or hide when government |
| **Mystery Shopper** (under Audits) | Not applicable to government | Hide when government |
| **Wastage** | Not relevant to government operations | Don't auto-activate for government |
| **Inventory** | Not relevant to most government | Don't auto-activate for government |

### 3. NAVIGATION — Terminology not applied to nav labels
The `useLabels` hook exists and has government overrides (Locations→Departments, Employees→Civil Servants, etc.), but the sidebar uses hardcoded i18n keys. Nav labels should respect terminology overrides:
- "Locations" → "Departments"  
- "Equipment" → "Public Assets"
- "Staff" → "Civil Servants"
- "Shifts" → "Duty Rosters"
- "Audits" → "Inspections"

**Solution**: In `AppSidebar.tsx`, add a `useLabels` integration that replaces specific nav label keys when overrides exist. Create a mapping from nav titleKeys to label keys.

### 4. TOOLTIPS & HELP TEXT — Missing everywhere
No navigation item or page header has explanatory tooltips. For a government institution (where users may be unfamiliar with the platform), every section needs a brief description.

**Solution**: Add a `description` field to each `NavigationItem` in `navigation.ts` and render it as a tooltip in the sidebar. Also add help text to page headers.

| Nav Item | Tooltip |
|----------|---------|
| Home | "Executive overview dashboard with departmental KPIs" |
| Workforce | "Manage civil servants, duty rosters, attendance, and training" |
| Audits/Inspections | "Schedule and conduct departmental inspections with compliance scoring" |
| Tasks | "Track operational tasks, assignments, and deadlines" |
| Equipment/Public Assets | "Manage public assets, maintenance schedules, and QR tracking" |
| Operations | "Daily operational workflows and SLA management" |
| Corrective Actions | "Track and resolve non-conformances from inspections" |
| Notifications | "Send alerts and announcements to civil servants" |
| Reports | "Performance analytics, compliance trends, and insights" |
| Documents | "Centralized document storage with version control" |
| Approvals | "Multi-step approval workflows for institutional governance" |
| Terminology | "Customize platform labels to match your institution's language" |
| Company Settings | "Manage institution profile, departments, and configuration" |

### 5. SETTINGS SECTION — Platform admin items showing
Items like Platform Admin, System Health, Debug Data, User Management, Billing & Modules show because the current user IS a platform admin. This is **correct behavior** but looks messy in the government context. These are already gated by `requiresPlatformAdmin: true` — no code change needed, but worth noting.

### 6. PAGES MISSING HELP CONTEXT
Each government page should have contextual help:
- **Executive Dashboard**: Add a brief explainer card for first-time users
- **Approval Queue**: Add tooltip explaining the multi-step workflow
- **Approval Workflows**: Add help text explaining how to set up sequential approvals
- **Terminology Settings**: Already has descriptions per field (good)

## Implementation Plan

### Step 1: Data migration — fix `is_active` to `true`
SQL migration to update all 13 companion modules for the Government Institution company.

### Step 2: Add `description` to NavigationItem type
Update `src/config/navigation.ts` to include an optional `description?: string` on `NavigationItem` and populate it for all items.

### Step 3: Render tooltips in sidebar
In `AppSidebar.tsx`, show the description as a tooltip when hovering over each nav item (both expanded and collapsed states).

### Step 4: Apply terminology overrides to nav labels
In `AppSidebar.tsx`, integrate `useLabels` to dynamically replace nav item labels based on company terminology overrides. Create a mapping:
```text
nav.locations  → label("locations")
nav.equipment  → label("equipment") 
nav.staff      → label("employees")
nav.shifts     → label("shifts")
nav.audits     → label("audits")
```

### Step 5: Add page-level help text
Add subtitle/help text to government-specific pages (Executive Dashboard, Approval Queue, Approval Workflows) and key shared pages (Workforce, Audits, Reports).

### Step 6: Hide irrelevant items for government
Add a `hideForGovernment?: boolean` flag to nav items (Template Marketplace, Mystery Shopper, Sales sub-item under Locations) and filter them out when the company industry is government.

### Files to modify
| File | Changes |
|------|---------|
| Migration SQL | Fix `is_active = true` for all companion modules |
| `src/config/navigation.ts` | Add `description` field to all nav items |
| `src/components/layout/AppSidebar.tsx` | Render tooltips, integrate `useLabels` for dynamic labels, filter government-irrelevant items |
| `src/components/dashboard/ExecutiveDashboard.tsx` | Add onboarding help card |
| `src/pages/ApprovalQueue.tsx` | Add contextual help text |
| `src/pages/settings/ApprovalWorkflows.tsx` | Add help text for workflow setup |

