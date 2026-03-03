

# Fix: AppSidebar Ignoring Role Checks for Members

## Problem

The fix we applied to `useNavigationResolver.ts` does NOT affect the actual sidebar. As noted in the memory ("sidebar-implementation-drift"), `AppSidebar.tsx` has its **own independent** `shouldShowItem` and `shouldShowSubItem` functions with hardcoded navigation arrays. These functions have the same bug we already fixed in the resolver — for `company_member` users, they skip `allowedRoles` and only check `companyPermission` (lines 496-504 and 526-530).

This is why Sonia still sees Notifications, Wastage, QR Forms, Documents, Equipment, CMMS, Operations, Corrective Actions, WhatsApp, and Integrations.

## Fix

### `src/components/layout/AppSidebar.tsx` — two changes

**1. `shouldShowItem` (lines 496-504):** Add `allowedRoles` check before `companyPermission` for members:

```typescript
if (isMember) {
  if (item.allowedRoles && item.allowedRoles.length > 0) {
    if (!hasAllowedRole(item.allowedRoles)) return false;
  }
  if (item.companyPermission) {
    return hasPermission(item.companyPermission);
  }
  return true;
}
```

**2. `shouldShowSubItem` (lines 526-530):** Same pattern — add `allowedRoles` check for member sub-items.

### Result for Sonia (HR + member)

She will see: Home, Workforce, Audits, Tasks, Reports, Inventory, Template Marketplace — approximately 7 items instead of 17+.

No other files need changes.

