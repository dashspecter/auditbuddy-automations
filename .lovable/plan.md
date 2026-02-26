

# Fix Plan: Scouts Missing from Navigation & Module Management

## Root Cause Analysis

Three things were never wired up when the Scouts module was built:

| # | Issue | Why it matters |
|---|-------|---------------|
| 1 | **No row in `modules` table** for code `'scouts'` | The Module Management UI (`IndustryModuleManagement.tsx`) reads from the `modules` table. No row = not visible on settings page. |
| 2 | **`MODULE_NAMES` and `MODULE_DEPENDENCIES` maps** in `IndustryModuleManagement.tsx` don't include `'scouts'` | Even after inserting the DB row, the UI won't show the friendly name or dependency info. |
| 3 | **Scouts routes in `App.tsx` have no `ModuleGate`** | Routes use `ManagerRoute` for role-check but never wrap with `<ModuleGate module="scouts">`, so the feature can't be toggled on/off. The nav sub-item also has no `companyPermission` gating. |

## Fix Plan (Single Phase)

### 1. Database: Insert Scouts into `modules` table

SQL migration to insert a row:
```sql
INSERT INTO public.modules (name, code, description, base_price, industry_scope, icon_name, is_active)
VALUES ('Dashspect Scouts', 'scouts', 'Dispatch vetted field workers (Scouts) to perform location audits, stock checks, and mystery shopping with photo/video evidence', NULL, 'GLOBAL', 'Users', true);
```

### 2. Frontend: Add Scouts to Module Management UI

In `src/components/settings/IndustryModuleManagement.tsx`:
- Add `'scouts'` entry to `MODULE_DEPENDENCIES` (works with: `location_audits`, `reports`)
- Add `'scouts': 'Dashspect Scouts'` to `MODULE_NAMES`

### 3. Frontend: Add ModuleGate to Scouts routes

In `src/App.tsx`, wrap all `/scouts/*` routes with `<ModuleGate module="scouts">` so they respect the module toggle.

### 4. Frontend: Gate nav sub-item by module

In `src/config/navigationConfig.ts`, add `companyPermission` to the scouts sub-item under Operations so it only shows when the module is active. Alternatively, since `SubNavItem` doesn't support a `module` field, we can keep it under Operations and rely on the `ModuleGate` at the route level to block access.

### Files Changed

| File | Change |
|------|--------|
| New SQL migration | Insert `scouts` row into `modules` table |
| `src/components/settings/IndustryModuleManagement.tsx` | Add to `MODULE_DEPENDENCIES` and `MODULE_NAMES` |
| `src/App.tsx` | Wrap scouts routes with `<ModuleGate module="scouts">` |
| `src/components/ModuleGuard.tsx` | Add `'scouts': 'Dashspect Scouts'` to `getModuleName` |

