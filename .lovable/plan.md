

# Hiding Billing & Modules for Proper Pizza

## Context

Proper Pizza is on the `free` tier with `active` status. The "Billing & Modules" nav item and the "Modules" / "Billing" tabs in Company Settings are visible to company owners but aren't being used.

## The question: per-company or global?

There's currently **no per-company feature flag system** in the codebase. Two approaches:

### Option A: Hide globally for non-platform-admin users (recommended)

Since module management is already done by **platform admins** (you) via the Platform Admin panel, company owners don't need "Billing & Modules" or the Modules/Billing tabs in Company Settings. This applies to ALL client companies, not just Proper Pizza.

Changes:
1. **`navigationConfig.ts` + `navigation.ts` + `AppSidebar.tsx`**: Change `settings-billing` from `requiresOwner: true` → `requiresPlatformAdmin: true` (hides it from company owners, keeps it for platform admins)
2. **`CompanySettings.tsx`**: Conditionally hide the "Modules" and "Billing" `TabsTrigger` items unless the user is a platform admin

### Option B: Add a per-company flag

Add a `hide_billing` boolean column to `companies` table, check it in nav and settings. More flexible but adds complexity for something no client company currently uses.

## Recommendation

**Option A** — hide billing/modules from all company owners globally. Platform admins already manage modules via the Platform Admin panel. This is simpler, more secure, and applies the right principle: clients shouldn't self-manage billing/modules if that's handled by the platform operator.

### Files to change (4 files, small edits each)
- `src/config/navigationConfig.ts` — change `requiresOwner` → `requiresPlatformAdmin` on `settings-billing`
- `src/config/navigation.ts` — same change
- `src/components/layout/AppSidebar.tsx` — same change in the hardcoded settings array
- `src/pages/CompanySettings.tsx` — hide "Modules" and "Billing" tabs unless platform admin

No database changes needed.

