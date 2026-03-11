

# Why the Setup Checklist Doesn't Show for New Companies

## Root Cause

The dismiss key `dashspect_setup_checklist_dismissed` in localStorage is **not company-scoped**. If you dismissed the checklist on a previous company, it stays dismissed forever — even when you create a brand new company with zero setup done.

```typescript
// Current — global key, one dismiss covers ALL companies
const DISMISS_KEY = "dashspect_setup_checklist_dismissed";
localStorage.getItem(DISMISS_KEY) === "true" → hidden
```

## Fix

Make the dismiss key company-specific so each company gets its own checklist lifecycle.

### `src/components/dashboard/CompanySetupChecklist.tsx`

- Change the dismiss key from a static string to `dashspect_setup_checklist_dismissed_${company.id}`
- The `dismissed` state initialization and `handleDismiss` both need to use the company-scoped key
- Add `company?.id` as a dependency so the dismissed state recalculates when switching companies

| File | Change |
|------|--------|
| `src/components/dashboard/CompanySetupChecklist.tsx` | Scope dismiss key to `company.id` |

One file, ~5 lines changed. No database changes.

