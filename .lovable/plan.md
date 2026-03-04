

# Two User Management Pages — Analysis & Recommendation

## What Exists Today

| Page | Route | Access Guard | Data Source | Purpose |
|---|---|---|---|---|
| **Company Settings → Users** | `/company-settings` (Users tab) | `CompanyOwnerRoute` (owner only) | `company_users` table | Manage users within THIS company: invite, set company role (owner/admin/member), toggle platform roles (manager/HR/checker) |
| **User Management** | `/admin/users` | `AdminRoute` (platform admin OR company admin) | `profiles` + `user_roles` tables (ALL users globally) | Manage ALL platform users across ALL companies, assign platform roles, assign role templates |

## The Problem

1. **Overlapping functionality**: Both pages let you toggle platform roles (manager/HR/checker). A company owner/admin sees both in the sidebar and doesn't know which to use.

2. **User Management shows "0 users"**: It queries the global `profiles` table without filtering by company. For a company admin (not platform admin), RLS likely blocks access to other companies' profiles, and the query has no company filter — so it may return nothing or only the current user.

3. **User Management is at `/admin/users`** behind `AdminRoute` which allows both platform admins AND company admins (line 43: `!roleData?.isAdmin && !roleData?.isCompanyAdmin`). But the page was designed for **platform-level** global management — it shouldn't be accessible to company admins at all.

4. **Confusing nav**: The sidebar shows both "Company Settings" and "User Management" under SETTINGS for company owners/admins, creating confusion about which one to use.

## Recommendation

**Company Settings → Users** is the correct page for company-level user management. **User Management** should be restricted to platform admins only (for cross-company, global user administration).

### Changes

1. **Restrict User Management to platform admins only**
   - `src/config/navigationConfig.ts` line 351: Change `requiresCompanyAdmin: true` → `requiresPlatformAdmin: true`
   - `src/App.tsx` line 342: The route already uses `AdminRoute`, but `AdminRoute` allows company admins too. Either create a stricter `PlatformAdminRoute` or update `AdminRoute` to have a `platformOnly` prop for this route.
   - Simplest approach: change the route guard from `<AdminRoute>` to check `roleData?.isAdmin` only (not `isCompanyAdmin`)

2. **No changes needed to Company Settings → Users** — it's working correctly for its purpose

3. **Files to modify**:
   - `src/config/navigationConfig.ts` — change User Management visibility to `requiresPlatformAdmin`
   - `src/App.tsx` — wrap User Management route with platform-admin-only guard

This way, company owners/admins use **Company Settings → Users** (scoped to their company), and only platform admins see **User Management** (global cross-company view).

