

# CMMS Shows in Nav Despite Module Being Inactive

## Root Cause

Both `navigationConfig.ts` (line 197) and `AppSidebar.tsx` (line 255) define CMMS with `module: null`. This means the `shouldShowItem` filter skips the module check entirely — CMMS always appears for admin/manager roles regardless of whether the company has the CMMS module activated.

The same issue exists in `navigationConfig.ts` for several other items that probably should be module-gated but aren't (Locations, Tasks, Operations, Corrective Actions, Marketplace). However, the user is specifically asking about CMMS.

## Fix

Change `module: null` to `module: "cmms"` in both files:

1. **`src/components/layout/AppSidebar.tsx`** line 255: change `module: null` → `module: "cmms"`
2. **`src/config/navigationConfig.ts`** line 197: change `module: null` → `module: "cmms"`

This ensures `shouldShowItem` / `canAccessModule` will hide CMMS when the module is inactive for a company.

**Prerequisite check**: Verify that `"cmms"` exists in the module registry so `canAccessModule` recognizes it.

