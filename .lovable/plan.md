

# Fix: End-to-End Module Management Across the Platform

## Problems Found

1. **CompanyDetail.tsx (Platform Admin)**: Shows "No active modules" as a read-only list with no way to add/remove modules for a client company. Platform admins are stuck.

2. **ModuleManagement.tsx (Settings > Billing & Modules)**: Still hardcodes only 7 of 18 modules — does NOT use the `moduleRegistry.ts` we just created. So even the company's own settings page is incomplete.

3. **No admin-level module management**: There is no way for a platform admin to toggle modules on behalf of a client company from the admin detail page.

## Plan

### 1. Update ModuleManagement.tsx to use the module registry
- Replace the hardcoded `MODULE_CONFIG` (7 modules) with `MODULE_REGISTRY` from `src/config/moduleRegistry.ts` (all 18 modules)
- Group by category (Core, Operations, Communication, Analytics) for consistency with the onboarding selection page
- Keep the existing toggle/switch UX and confirmation dialog

### 2. Add module management to CompanyDetail.tsx (Platform Admin)
- Replace the read-only badges section with an interactive module toggle UI
- Add switches per module so the platform admin can enable/disable modules for any company
- Use `upsert` logic (same pattern as ModuleSelection) to activate/deactivate modules directly on the target company's `company_modules` rows
- This operates on the target company's `company_id` (from URL params), not the admin's own company

### 3. Files to modify
- `src/components/settings/ModuleManagement.tsx` — replace hardcoded list with registry
- `src/pages/admin/CompanyDetail.tsx` — add interactive module management for admins

### 4. What we preserve
- Existing toggle confirmation dialog in ModuleManagement
- RLS policies (platform admins already have access via `is_super_admin` checks)
- The registry as single source of truth — no more duplicate module lists

