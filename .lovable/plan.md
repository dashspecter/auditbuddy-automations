

# Analysis: Why Sonia Sees All Navigation Items

## Current State

Sonia (`sonia@lbfc.ro`) has:
- **Company role**: `company_member`
- **Platform role**: `hr`
- **Role template**: None assigned
- **Member permissions granted by company**: `view_reports`, `manage_locations`, `manage_employees`, `manage_shifts`, `manage_audits`, `manage_notifications` (6 of 10 — very broad)

## Why She Sees Everything

There are **two issues** working together:

### Issue 1: Navigation resolver skips role checks for members

In `useNavigationResolver.ts` (lines 175-180), for `company_member` users without a template, the code **only** checks `companyPermission` and completely ignores `allowedRoles`:

```typescript
// Current code for members:
if (isMember) {
  if (item.companyPermission) {
    return hasPermission(item.companyPermission); // Only checks permission
  }
  return true; // No permission required = always visible
}
// allowedRoles check below is NEVER reached for members
```

This means items like Equipment (`allowedRoles: ['admin', 'manager']`), CMMS, Notifications, Wastage, Documents, Operations, Corrective Actions, etc. all show up even though they should be restricted to admin/manager roles only.

### Issue 2: Company has very broad member permissions

The company granted members 6 of 10 permissions, making almost everything pass the permission check.

## What Sonia SHOULD See (based on `allowedRoles` that include `hr`)

| Item | `allowedRoles` | Should See? |
|---|---|---|
| Home | none | Yes |
| Workforce | `['admin', 'manager', 'hr']` | Yes |
| Audits | `['admin', 'manager', 'hr', 'checker']` | Yes |
| Tasks | none | Yes |
| Reports | `['admin', 'manager', 'hr']` | Yes |
| Marketplace | `['admin', 'manager', 'hr', 'checker']` | Yes |
| Notifications | `['admin', 'manager']` | **No** |
| Wastage | `['admin', 'manager']` | **No** |
| QR Forms | `['admin', 'manager']` | **No** |
| Inventory | none | Yes (module gate only) |
| Documents | `['admin', 'manager']` | **No** |
| Locations | none (no allowedRoles) | Yes |
| Equipment | `['admin', 'manager']` | **No** |
| CMMS | `['admin', 'manager']` | **No** |
| Operations | `['admin', 'manager']` | **No** |
| Corrective Actions | `['admin', 'manager']` | **No** |
| WhatsApp | `['admin', 'manager']` | **No** |
| Integrations | `['admin']` | **No** |

That cuts her visible items from ~17 to ~7 — a much more appropriate HR view.

## Fix

### Single change in `useNavigationResolver.ts`

For members in legacy mode, check `allowedRoles` **in addition to** `companyPermission`. The member's platform role (e.g., `hr`) is matched against the item's `allowedRoles` list:

```typescript
// For company members, check BOTH allowedRoles AND company permissions
if (isMember) {
  // First check allowedRoles (if defined)
  if (item.allowedRoles && item.allowedRoles.length > 0) {
    if (!hasAllowedRole(item.allowedRoles)) return false;
  }
  // Then check companyPermission
  if (item.companyPermission) {
    return hasPermission(item.companyPermission);
  }
  return true;
}
```

Same logic applied to `shouldShowSubItem` for sub-items.

### No other files change
- Navigation config already has correct `allowedRoles` on every item
- The `hasAllowedRole` function already handles the `hr` role correctly
- Route-level guards and RLS policies remain unchanged

