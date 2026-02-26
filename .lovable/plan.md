
## What’s happening (non-technical)
- Scouts is enabled in your backend module settings, and your current tier allows it.
- But the sidebar is not reading the file that was edited earlier.
- So Scouts exists in one config file, but not in the menu component that is actually rendered.

## Why Scouts is missing
1. Desktop sidebar (`src/components/layout/AppSidebar.tsx`) uses its own hardcoded `navigationItems` list.
2. In that list, **Operations** only has Daily Ops, Maintenance Tasks, and SLA Management — no Scouts item.
3. Earlier edits were made in `src/config/navigationConfig.ts`, but this file is not used by the rendered desktop sidebar.
4. Mobile navigation (`src/components/layout/MobileBottomNav.tsx`) also uses a separate hardcoded list and also has no Scouts entry.
5. Result: module is enabled and routes exist, but no visible navigation link to access it.

## Implementation plan
1. **Fix desktop sidebar visibility**
   - Edit `src/components/layout/AppSidebar.tsx`
   - Under Operations `subItems`, add Scouts:
     - `titleKey: "nav.scouts"`
     - `url: "/scouts"`
     - `module: "scouts"`
     - `allowedRoles: ['admin', 'manager']`
   - This ensures Scouts appears only when the module is enabled.

2. **Fix mobile menu visibility**
   - Edit `src/components/layout/MobileBottomNav.tsx`
   - Add a Scouts item in `moreNavItems`:
     - `title: "Scouts"`
     - `url: "/scouts"`
     - `module: "scouts"`
     - `managerOnly: true`
   - Keeps mobile and desktop behavior aligned.

3. **Stability follow-up to prevent future drift**
   - Align sidebar/mobile with one shared nav registry (recommended: `src/config/navigation.ts`) instead of separate hardcoded arrays.
   - This avoids future “updated config but UI didn’t change” regressions.

4. **Verification checklist**
   - In module settings, ensure Scouts is enabled.
   - Refresh and confirm **Operations → Scouts** appears on desktop.
   - Open Scouts pages from menu (`/scouts`, `/scouts/jobs`, `/scouts/review`).
   - Disable module and confirm Scouts disappears from nav.
   - Repeat check on mobile “More” menu.

## Technical details
- Confirmed data state:
  - Company tier is `enterprise`.
  - `company_modules` has both `operations` and `scouts` active.
- So module/tier gating is valid.
- Root cause is frontend nav source mismatch:
  - Previously edited: `src/config/navigationConfig.ts`
  - Actually rendered: `AppSidebar.tsx` and `MobileBottomNav.tsx`
