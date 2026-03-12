

# Make Government Operations an "all-inclusive" module

## Problem
When `government_ops` is activated, other modules (Audits, Workforce, Documents, etc.) still need to be individually enabled — leaving the sidebar empty for government companies.

## Solution
When `government_ops` is toggled ON for a company, automatically enable a predefined set of relevant modules. This happens in two places:

### 1. Admin toggle (CompanyDetail.tsx)
In `handleToggleModule`, when the module being enabled is `government_ops`, also upsert a set of companion modules as active:
- `location_audits`, `staff_performance`, `equipment_management`, `workforce`, `operations`, `corrective_actions`, `documents`, `reports`, `notifications`, `insights`

These are the modules that make sense for a government institution. Industry-specific ones like `scouts`, `wastage`, `qr_forms`, `payroll`, `whatsapp_messaging`, `cmms`, `inventory`, `integrations` would remain off by default (admin can still toggle them individually).

### 2. Onboarding flow (if government industry is selected)
In the onboarding modules step or the `seed_company_modules` RPC, when the industry is government, auto-select the same set of companion modules.

### 3. moduleRegistry.ts — add a `governmentDefault` flag
Add an optional `governmentDefault: true` property to each module definition that should auto-activate with government_ops. This keeps the list maintainable in one place.

### Changes
| File | Change |
|------|--------|
| `src/config/moduleRegistry.ts` | Add `governmentDefault?: boolean` to `ModuleDefinition`, mark ~10 modules |
| `src/pages/admin/CompanyDetail.tsx` | In `handleToggleModule`, when enabling `government_ops`, bulk-upsert all `governmentDefault` modules |
| `src/hooks/useModules.ts` | Same logic in `useToggleCompanyModule` mutation |

### 4. Immediate fix for current company
Run a migration to activate the companion modules for the existing "Government Institution" company.

