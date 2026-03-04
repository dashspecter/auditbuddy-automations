

# Inactive Modules Showing in Navigation — Root Cause & Fix

## What's Happening

The navigation sidebar in `AppSidebar.tsx` uses a hardcoded `navigationItems` array. Each item has a `module` property that `shouldShowItem` checks via `canAccessModule()`. If `module` is `null`, the module check is skipped entirely and the item always shows (for users with matching roles).

**The CMMS fix is already applied** (`module: "cmms"`) but several other nav items still have `module: null` despite having corresponding module entries in the registry that can be toggled on/off per company:

| Nav Item | Current `module` | Should Be | In moduleRegistry? |
|---|---|---|---|
| CMMS | `"cmms"` | ✓ Fixed | ✓ |
| Operations | `null` | `"operations"` | ✓ |
| Corrective Actions | `null` | `"corrective_actions"` | ✓ |
| Equipment | `"equipment_management"` | ✓ Already correct | ✓ |
| Locations | `null` | Keep `null` (core) | No dedicated module |
| Tasks | `null` | Keep `null` (core) | No dedicated module |
| Marketplace | `null` | Keep `null` (core) | No dedicated module |

For PROPER PIZZA specifically (from screenshot 2), these are **inactive**: Equipment Management, Operations, QR Forms, CMMS, Corrective Actions, Inventory, Documents.

## Why CMMS Might Still Show

If the user hasn't hard-refreshed since the fix deployed, the 15-minute `staleTime` on `company_modules` query means cached data persists. However, the fix itself is correct in code. The broader problem is the other items with `module: null`.

## Fix Plan

### 1. Gate remaining nav items by their module (AppSidebar.tsx + navigationConfig.ts + navigation.ts)

In all three navigation sources, update:
- **Operations**: `module: null` → `module: "operations"`
- **Corrective Actions**: `module: null` → `module: "corrective_actions"`

These are the only two that have `module: null` but clearly map to toggleable modules in the registry.

### 2. Add ModuleGate to CMMS routes (App.tsx)

Currently, CMMS routes only have `ManagerRoute` guards — no module check. A user could navigate directly to `/cmms` even if the module is inactive. Wrap all CMMS routes with `<ModuleGate module="cmms">`.

Same for Operations and Corrective Actions routes if they lack module gates.

### 3. Files to modify

- `src/components/layout/AppSidebar.tsx` — change `module: null` to proper module codes for Operations and Corrective Actions
- `src/config/navigationConfig.ts` — same changes
- `src/config/navigation.ts` — same changes  
- `src/App.tsx` — wrap CMMS, Operations, and Corrective Actions routes with `<ModuleGate>`

### 4. No database changes needed

The module registry and company_modules table already have the correct entries. This is purely a frontend gating issue.

