

# Fix Module Selection Onboarding Flow End-to-End

## Problems Identified

1. **Duplicate key error**: The `create_company_onboarding` RPC already inserts `location_audits` during signup. When the user reaches `ModuleSelection` and clicks "Activate", it does a plain `INSERT` which fails with `duplicate key value violates unique constraint "company_modules_company_id_module_name_key"`.

2. **Hardcoded module list**: `ModuleSelection.tsx` only shows 5 modules, but the platform has 18 valid modules (per the DB CHECK constraint). Missing: `workforce`, `documents`, `inventory`, `insights`, `integrations`, `wastage`, `qr_forms`, `whatsapp_messaging`, `payroll`, `cmms`, `corrective_actions`, `operations`, `scouts`.

3. **No single source of truth**: Module definitions (name, description, icon, features) are scattered — hardcoded in `ModuleSelection.tsx`, `ModuleGuard.tsx`, and navigation config independently.

## Plan

### 1. Create a shared module registry (`src/config/moduleRegistry.ts`)
- Single source of truth: a constant array of all 18 modules with their `code`, `displayName`, `description`, `features`, `icon`, and `color`
- Used by `ModuleSelection`, `ModuleGuard`, and any future module-related UI
- Replaces the hardcoded `getModuleName()` in `ModuleGuard.tsx`

### 2. Fix `ModuleSelection.tsx`
- Import module list from the registry instead of hardcoding 5 modules
- Show all 18 modules, organized in a scrollable list
- Change `INSERT` to `UPSERT` (on conflict `company_id, module_name`) to avoid duplicate key errors when `create_company_onboarding` already seeded a module
- Pre-select modules that were already activated by the RPC (query `company_modules` on mount)
- Deactivate modules that were unchecked (set `is_active = false`)

### 3. Fix `create_company_onboarding` RPC
- Change the hardcoded `['location_audits']` in `Auth.tsx` to an empty array `[]`, since the user will pick modules on the next page
- Update the RPC to allow empty `p_modules` array (currently raises an exception if empty) — add a migration to make the array optional

### 4. Update `ModuleGuard.tsx`
- Replace inline `getModuleName()` map with import from the shared registry

## Files Modified
1. **NEW** `src/config/moduleRegistry.ts` — single source of truth for all module metadata
2. `src/pages/ModuleSelection.tsx` — use registry, upsert logic, pre-select existing, show all modules
3. `src/pages/Auth.tsx` — pass empty array to RPC (modules chosen on next page)
4. `src/components/ModuleGuard.tsx` — use registry for display names
5. **Migration** — update `create_company_onboarding` to allow empty modules array

## What We Don't Touch
- Database CHECK constraint (already has all 18 modules)
- Auth flow, navigation, routes, RLS policies
- `useModules.ts`, `CompanyContext.tsx`, `ModuleGate.tsx`

