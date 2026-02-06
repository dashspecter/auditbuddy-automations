# Dashspect Stability Baseline Document
**Generated: 2026-02-06**
**Purpose: Internal developer reference for stability hardening**

---

## 1. Current Route Architecture

### 1.1 Route Protection Hierarchy

| Route Guard | Purpose | Location |
|-------------|---------|----------|
| `ProtectedRoute` | Auth + company check + staff redirect | `src/components/ProtectedRoute.tsx` |
| `AdminRoute` | Platform admin only | `src/components/AdminRoute.tsx` |
| `ManagerRoute` | Manager/Admin + permission check | `src/components/ManagerRoute.tsx` |
| `CompanyAdminRoute` | Company admin/owner | `src/components/CompanyAdminRoute.tsx` |
| `CompanyOwnerRoute` | Company owner only | `src/components/CompanyOwnerRoute.tsx` |

### 1.2 Special Routes (No Company Required)
- `/onboarding/*` - Company setup flow
- `/pending-approval` - Awaiting company approval
- `/staff/*` - Staff mobile portal (uses employee record, not company_users)
- `/system-health` - System diagnostics
- `/kiosk/:token` - Public anonymous kiosk (outside AuthProvider)

### 1.3 Public Routes (No Auth)
- `/` - Landing/Index
- `/auth` - Login/Signup
- `/full-presentation` - Marketing presentation
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset completion
- `/mystery-shopper/:token` - Public survey form
- `/voucher/:code` - Public voucher page
- `/t/:shortCode` - Public test taking
- `/marketplace/share/:token` - Public template sharing

---

## 2. Navigation Configuration

### 2.1 Primary Navigation Sources

| Source | Type | Used By |
|--------|------|---------|
| `AppSidebar.tsx` (lines 47-270) | Desktop sidebar | Desktop layout |
| `MobileBottomNav.tsx` (lines 16-39) | Mobile bottom nav | Mobile layout |
| `Header.tsx` | Legacy header dropdowns | Public/old pages |

### 2.2 Known Navigation Issues
1. **Scattered definitions**: Desktop and mobile have separate nav arrays that can drift
2. **Module gating race**: If `canAccessModule()` returns false while loading, items disappear
3. **Permission loading**: `useUserRole()` returns `null` during loading, causing `hasAllowedRole()` to return `true` by default

### 2.3 Navigation Item Count
- **Desktop Sidebar**: 17 main items + 7 settings items
- **Mobile Bottom**: 4 main + 15 "More" items
- **Mismatch**: Mobile "More" items don't match desktop sidebar exactly

---

## 3. Auth + Company Context Flow

### 3.1 Bootstrap Sequence (Current)
```
1. AuthProvider mounts
   ├── getSession() → sets user/session
   └── onAuthStateChange subscription
2. staffCheckComplete becomes true (after 3 queries)
3. CompanyProvider mounts
   ├── useCompany() → fetches company data
   └── useCompanyModules() → fetches enabled modules
4. SidebarProvider mounts
5. Routes render → ProtectedRoute checks
```

### 3.2 Key Context Dependencies
| Hook | Dependencies | Blocking? |
|------|--------------|-----------|
| `useAuth()` | Supabase session | Yes - blocks all |
| `useCompany()` | user.id | Yes - blocks protected routes |
| `useCompanyModules()` | company.id (via RLS) | Yes - blocks nav rendering |
| `useUserRole()` | user.id | Partial - defaults to allow during loading |
| `usePermissions()` | user.id, company.id | Partial |

### 3.3 Known Race Conditions
1. **SIGNED_IN clears cache**: `queryClient.clear()` on SIGNED_IN causes full re-fetch storm
2. **TOKEN_REFRESHED invalidates**: More graceful but still triggers re-renders
3. **staffCheckComplete delay**: 3 sequential DB queries before staff routing decision

---

## 4. App Visibility Management

### 4.1 Current Implementation
- **Hook**: `useAppVisibility.ts` (mounted via `AppVisibilityManager`)
- **Default minHiddenMs**: 5 minutes (300,000ms)
- **Critical queries**: `['company', 'company_modules', 'user_role', 'permissions']`

### 4.2 Behavior
- On visibility change: validates session, invalidates critical queries
- On window focus: same logic with time threshold
- Does NOT hard reload unless session is invalid

### 4.3 Known Issues
1. **First boot revalidation**: `hasBootRevalidatedRef` triggers immediate revalidation
2. **No deduplication**: Multiple focus events in quick succession can queue multiple invalidations

---

## 5. Layout Wrappers

### 5.1 Current Layout Components
| Component | Used For |
|-----------|----------|
| `AppLayout` | Desktop/tablet with sidebar |
| `ProtectedLayout` | Wraps AppLayout for protected routes |
| `StaffBottomNav` | Staff mobile bottom navigation |
| `Header` | Legacy header (some pages) |

### 5.2 Inconsistencies
1. **Staff routes**: Use `StaffBottomNav` directly, no shared wrapper
2. **Public routes**: No consistent wrapper
3. **Some pages**: May render with both Header and AppLayout (double navigation)

---

## 6. Known Bugs Baseline

### 6.1 Missing Menu Items
- **Symptom**: Nav items disappear after refresh or tab switch
- **Root cause**: Module/permission loading race condition
- **Affected**: Both desktop sidebar and mobile bottom nav

### 6.2 Tab Switch Refresh
- **Symptom**: Page resets or shows loading spinner when returning to tab
- **Root cause**: `queryClient.clear()` on certain auth events
- **Mitigation**: `minHiddenMs` threshold in useAppVisibility (5 min)

### 6.3 Inconsistent Page Wrappers
- **Symptom**: Different pages have different padding/header behavior
- **Root cause**: No enforced shared PageLayout component

### 6.4 Staff Routing Delay
- **Symptom**: Brief flash of wrong content before redirect
- **Root cause**: `staffCheckComplete` requires 3 sequential queries

---

## 7. Query Client Configuration

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false, // Disabled globally
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});
```

### 7.1 Notes
- Global `refetchOnWindowFocus: false` prevents auto-refresh storms
- `staleTime: 5min` is reasonable for most data
- `retry: 1` limits retry noise

---

## 8. Phase 1 Targets

### 8.1 Navigation Registry
- Create single source of truth for all nav items
- Unified desktop/mobile configuration
- Skeleton loading state during resolution

### 8.2 App Bootstrap Hook
- Consolidate auth + company + modules + permissions
- Single `status: 'loading' | 'ready' | 'error'`
- Block rendering until ready

### 8.3 Stable Route Guards
- Centralize guard logic
- Consistent loading/error/forbidden states
- No partial renders

### 8.4 Tab Switch Stability
- Remove aggressive cache clears
- Smarter revalidation strategy
- No full page reloads on focus

---

## 9. Files to Modify (Phase 1)

| File | Action |
|------|--------|
| `src/lib/debug/logger.ts` | NEW - Gated diagnostic logging |
| `src/config/navigation.ts` | NEW - Unified nav registry |
| `src/hooks/useAppBootstrap.ts` | NEW - Combined bootstrap hook |
| `src/hooks/useAppVisibility.ts` | MODIFY - Refine revalidation |
| `src/contexts/AuthContext.tsx` | MODIFY - Remove cache clear on SIGNED_IN |
| `src/components/layout/AppSidebar.tsx` | MODIFY - Use nav registry |
| `src/components/layout/MobileBottomNav.tsx` | MODIFY - Use nav registry |
| `src/components/ProtectedRoute.tsx` | MODIFY - Use bootstrap hook |

---

## 10. Rollback Strategy

Each change should be:
1. **Incremental**: One logical change per commit
2. **Feature-flagged**: Where possible, use env vars to toggle
3. **Reversible**: Document how to undo each change
4. **Tested**: Verification steps before merging

---

*End of Baseline Document*
