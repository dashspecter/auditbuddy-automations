

# Integrate Contract Features into the Workforce Staff Page

## Problem

The contract template upload button and contract generation button were added to the old `/admin/employees` page (`EmployeeManagement.tsx`), but you're using the `/workforce/staff` page (`Staff.tsx` + `StaffTable.tsx`). That's why you don't see any contract-related buttons.

## What Needs to Change

### 1. `Staff.tsx` — Add "Upload Template" button
Add the `ContractTemplateDialog` import and an "Upload Template" button next to "Add Staff" in the header area.

### 2. `StaffTable.tsx` — Add contract generation button per employee
Add a `FileText` icon button in the Actions column (both mobile and desktop views) that opens the `GenerateContractDialog` for that employee. Currently the Actions column only has: KeyRound (reset password), Edit, View. We need to add the contract generation icon between KeyRound and Edit.

### 3. Both files need state management
- `Staff.tsx`: state for `templateDialogOpen` + render `ContractTemplateDialog`
- `StaffTable.tsx`: state for `contractDialogOpen` + `employeeForContract` + render `GenerateContractDialog`

## Files Changed

| File | Change |
|------|--------|
| `src/pages/workforce/Staff.tsx` | Add Upload Template button + `ContractTemplateDialog` |
| `src/components/workforce/StaffTable.tsx` | Add FileText contract button per row + `GenerateContractDialog` |

No backend changes needed — the edge functions and dialogs already exist.

