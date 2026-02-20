

## Widen the "Create Auto-Generation Rule" Dialog

### Problem
The rule creation dialog contains a lot of important fields (name, trigger type, severity, SLA hours, stop-the-line toggle, scope selector, and multiple action items). At `max-w-xl` (576px), it feels cramped and users may miss details.

### Solution
A single CSS class change: update the dialog's `max-w` from `sm:max-w-xl` to `sm:max-w-2xl` (672px) in `src/pages/correctiveActions/CorrectiveActionRules.tsx` at line 1169. This gives about 100px more breathing room on desktop while remaining fully responsive on mobile.

### Technical Detail
- **File:** `src/pages/correctiveActions/CorrectiveActionRules.tsx`, line 1169
- **Change:** `sm:max-w-xl` to `sm:max-w-2xl`
- No other files affected

