

## Bug: Evidence Policy "Require proof photo" Not Persisting on Edit

### Root Cause Analysis

Two issues found in `src/pages/TaskEdit.tsx`:

**Issue 1 — Upsert errors are silently swallowed (PRIMARY CAUSE)**

The upsert call at line 182 does NOT check the returned `{ error }` object:
```typescript
await supabase.from("evidence_policies").upsert({ ... });
// No { error } destructuring — RLS failures are invisible
```
The Supabase JS client returns `{ data, error }` without throwing exceptions. The surrounding `try-catch` block (line 174-199) only catches thrown JavaScript errors, not Supabase-returned error objects. If the INSERT or UPDATE is rejected by RLS, the code proceeds silently as if it succeeded.

**Issue 2 — No DELETE RLS policy exists**

The `evidence_policies` table has SELECT, INSERT, and UPDATE RLS policies but NO DELETE policy. When a user unchecks the toggle and saves (line 193-194), the delete call will always fail silently due to RLS.

### Fix Plan

**Step 1: Add proper error handling to the upsert and delete calls in `TaskEdit.tsx`**

Destructure `{ error }` from both the upsert and delete calls. If an error is returned, log it and show the warning toast. This is the same pattern needed in `TaskNew.tsx`.

File: `src/pages/TaskEdit.tsx` (lines 182-194)

```typescript
const { error: upsertErr } = await supabase.from("evidence_policies").upsert({ ... });
if (upsertErr) throw upsertErr;
```

And for delete:
```typescript
const { error: delErr } = await supabase.from("evidence_policies").delete().eq("id", evidencePolicyId);
if (delErr) throw delErr;
```

**Step 2: Add DELETE RLS policy for `evidence_policies`**

Database migration to add:
```sql
CREATE POLICY "evidence_policies_delete_managers"
  ON public.evidence_policies FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );
```

**Step 3: Apply the same error handling fix in `TaskNew.tsx`**

The same silent-failure pattern exists in the task creation flow. Destructure and check `{ error }` there too.

### Summary

| Change | File |
|--------|------|
| Check `{ error }` from upsert/delete calls | `src/pages/TaskEdit.tsx` |
| Check `{ error }` from upsert call | `src/pages/TaskNew.tsx` |
| Add DELETE RLS policy | Database migration |

