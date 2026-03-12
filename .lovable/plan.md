

# Remove incorrect platform admin role

## Problem
`alex@lebab.ro` (ID: `f9896025-8366-40eb-abce-73f2bfddd2aa`) incorrectly has the `admin` role in `user_roles`. Only `alex@grecea.work` should be a platform admin.

## Solution
Run a single database migration to delete the admin role entry for `alex@lebab.ro`.

```sql
DELETE FROM public.user_roles
WHERE user_id = 'f9896025-8366-40eb-abce-73f2bfddd2aa'
  AND role = 'admin';
```

No code changes needed. After this, only `alex@grecea.work` will appear as a platform administrator.

