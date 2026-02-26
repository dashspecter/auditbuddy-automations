

# Fix: Scouts Module Toggle — Duplicate Key Error

## Root Cause

The `useToggleCompanyModule` hook uses `.upsert()` without specifying `onConflict: 'company_id,module_name'`. When a row already exists (even if `is_active = false`), the upsert tries to insert a new row instead of updating the existing one, hitting the unique constraint `company_modules_company_id_module_name_key`.

This affects ALL modules when toggling off then back on, not just Scouts — Scouts just happens to be the first one triggering it because it was freshly inserted.

## Fix

**File: `src/hooks/useModules.ts`** (single change)

Add `onConflict: 'company_id,module_name'` to the upsert call so it correctly updates existing rows instead of trying to insert duplicates:

```typescript
const { error } = await supabase
  .from("company_modules")
  .upsert(
    {
      company_id: companyId,
      module_name: moduleCode,
      is_active: true,
    },
    { onConflict: 'company_id,module_name' }
  );
```

This is a one-line fix in a single file.

