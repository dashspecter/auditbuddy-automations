

# Fix: User Management Still Showing for Company Owners

## Problem

The previous fix updated `navigationConfig.ts` and `App.tsx` but missed the **third copy** of the navigation — the hardcoded `settingsItems` array in `AppSidebar.tsx`. This is why User Management still appears in the sidebar for PROPER PIZZA's company owner.

At line 384 of `AppSidebar.tsx`, User Management has `requiresOwner: true` instead of `requiresPlatformAdmin: true`.

## Fix

One line change in `src/components/layout/AppSidebar.tsx`:

- **Line 384**: Change `requiresOwner: true` to `requiresPlatformAdmin: true`

This aligns the sidebar with the route guard (`PlatformAdminRoute`) and `navigationConfig.ts` — all three sources will now agree that User Management is platform-admin-only.

Company owners/admins will continue using **Company Settings → Users tab** to manage their company's users.

## Also: Header dropdown

The Header component (line 669-673) has a "User Management" link in a dropdown menu. Need to check if it's also gated — if not, wrap it with the same platform admin check.

### Files to modify
- `src/components/layout/AppSidebar.tsx` — change `requiresOwner` to `requiresPlatformAdmin` for User Management
- `src/components/Header.tsx` — verify/fix the User Management link visibility (only if ungated)

