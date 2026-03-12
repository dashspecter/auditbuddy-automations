

# Fix missing translation keys for Government Operations navigation

## Problem
The sidebar shows raw translation keys (`nav.approvals`, `nav.terminology`) instead of proper labels because these keys were never added to the i18n locale files when the Government Operations module was built.

## Changes

### 1. `src/i18n/locales/en.json` — add 4 missing nav keys
Before line 222 (end of `nav` section), add:
- `"approvals": "Approvals"`
- `"approvalQueue": "Approval Queue"`
- `"approvalWorkflows": "Workflows"`
- `"terminology": "Terminology"`

### 2. `src/i18n/locales/ro.json` — add same 4 keys in Romanian
- `"approvals": "Aprobări"`
- `"approvalQueue": "Coadă de aprobări"`
- `"approvalWorkflows": "Fluxuri de lucru"`
- `"terminology": "Terminologie"`

No code logic changes needed — just missing translation strings.

