
Issue understood. I re-traced this end-to-end with code + database policy inspection.

Do I know what the issue is? Yes.

## What is actually failing

Your task save works, but the **evidence policy write** fails afterward.

I confirmed this pattern:
- Task create/edit succeeds.
- Then evidence policy save fails.
- UI shows: “Task saved, but evidence policy could not be updated”.
- Result: “Require proof photo” appears unchecked when you return.

## Root cause (confirmed)

### 1) RLS mismatch on `evidence_policies` write policies
Current write policies (`INSERT/UPDATE/DELETE`) allow only:
- `company_owner`
- `company_admin`
- `company_manager` (company role)

But your active task creators are `company_member` + `user_roles.role = manager` (template/manager role architecture), not `company_manager` in `company_users`.

So writes are blocked by backend security, even though task CRUD is allowed.

### 2) The task pages still use `company_users.single()` to get company_id
In `TaskNew.tsx` and `TaskEdit.tsx`, evidence save path resolves company via:
- `company_users ... .single()`
This is brittle (multi-company or shape mismatches can skip policy save path). It should use current company context first and fail explicitly if missing.

## Files and areas to fix

- `supabase` migration (new)
- `src/pages/TaskNew.tsx`
- `src/pages/TaskEdit.tsx`
- (optional hardening) shared helper for task evidence policy write

## Implementation plan (A → Z)

### Step A — Backend policy fix (primary blocker)
Create a migration to replace evidence policy write RLS so manager-role users can write when they belong to the same company.

- Drop:
  - `evidence_policies_insert_managers`
  - `evidence_policies_update_managers`
  - `evidence_policies_delete_managers`
- Recreate with company scoping + manager/admin role support through `user_roles` (`has_role`), while still scoped to `company_users.company_id`.

Target access expression pattern:
- same company via `company_users`
- and one of:
  - company role in (`company_owner`,`company_admin`,`company_manager`)
  - OR `has_role(auth.uid(), 'admin')`
  - OR `has_role(auth.uid(), 'manager')`

Also include explicit `WITH CHECK` on update/insert for correctness.

### Step B — Frontend reliability in TaskNew
In `TaskNew.tsx`:
- Use active company from context (`useCompanyContext().company?.id`) as primary `company_id`.
- Keep strict error handling around policy write.
- Make policy save deterministic:
  - `upsert(..., { onConflict: "company_id,applies_to,applies_id" })`
  - check returned error
- If policy write fails, show warning with short actionable detail.

### Step C — Frontend reliability in TaskEdit
In `TaskEdit.tsx`:
- Same company-id source hardening (context-first).
- Keep current isolated error handling (good pattern).
- Improve update/delete flow:
  - upsert error check (already present, keep)
  - delete error check (already present, keep)
  - after successful upsert, refresh/set `evidencePolicyId` from returned row to avoid stale state edge cases
- In load effect, explicitly reset local evidence state when no policy is found (prevents stale UI on task switch edge cases).

### Step D — Prevent drift with one shared helper (recommended)
Create a shared utility (or hook) used by both TaskNew and TaskEdit:
- `saveTaskEvidencePolicy({ companyId, taskId, evidenceRequired, reviewRequired, instructions, existingPolicyId })`
This removes duplicated logic and avoids future regressions where one page is fixed and the other is not.

### Step E — Full verification checklist
After implementation, validate with these scenarios:

1. Create task with “Require proof photo = ON”  
   - Save task  
   - Reopen edit page  
   - Toggle remains ON

2. Create task with ON + “Review required = ON” + instructions  
   - Reopen  
   - all fields persist

3. Edit existing task ON → OFF  
   - Save  
   - Reopen  
   - toggle remains OFF

4. Edit existing task OFF → ON  
   - Save  
   - Reopen  
   - toggle remains ON

5. Staff completion gate test  
   - For a task with evidence required, completion is blocked until proof exists.

6. Permission boundary test  
   - Manager-role user can save/remove task evidence policy.
   - Non-manager/non-admin member cannot mutate policy.

7. Data verification  
   - `evidence_policies` row exists for ON; removed (or absent) for OFF.
   - No duplicate rows per `(company_id, applies_to, applies_id)`.

## Technical details

### Why this is the correct security model
- Roles remain in dedicated role tables (`user_roles` / `company_users`), not profiles/users.
- No client-side admin checks (no localStorage trust).
- Authorization stays server-side via RLS + `has_role` security-definer function.
- Company isolation remains enforced by company-scoped predicates.

### Why previous fix was incomplete
- Error handling was improved, but write permission logic still excluded `user_roles.manager` users.
- So failure became visible (warning toast), but persistence still failed.

### Expected outcome
Once these changes are applied, task evidence policy will persist correctly in both:
- **Create Task**
- **Edit Task**
for authorized manager users, with secure backend enforcement and no silent drift.
