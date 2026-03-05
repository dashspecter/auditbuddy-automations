

# Fix: Remove Incorrect Platform Admin Escalation

## Problem

The recent backfill migration inserted `role = 'admin'` into `user_roles` for ALL company owners. In this platform, `user_roles.admin` = **platform administrator** (cross-company access, Platform Administration page, debug tools). Company owners only need `company_owner` in `company_users` — that already grants them full control over their own company via `isCompanyAdmin` checks.

This means Daniel Popescu (Proper Pizza), gigi kent (BenStone), and Abdullah Thayab (Naturacreta) currently have **god-mode access** to the entire platform.

## Fix (single migration)

### 1. Remove incorrect platform admin roles

Delete `user_roles` entries for the three client-owned accounts that should NOT be platform admins:

```sql
DELETE FROM public.user_roles
WHERE role = 'admin'
  AND user_id IN (
    -- Daniel Popescu (Proper Pizza)
    '595298fc-a95f-4adf-86da-d2115808b37d',
    -- gigi kent (BenStone)
    '3445bf86-21b4-45b7-8269-04927bb4357e',
    -- Abdullah Thayab (Naturacreta)
    '5ae75931-b114-4139-8792-1606a242a1cb'
  );
```

Keep `alex@grecea.work` and `alex@lebab.ro` as platform admins.

### 2. Revert onboarding RPC

Remove the `INSERT INTO user_roles` line from `create_company_onboarding`. New company owners should NOT get platform admin. They already get `company_owner` in `company_users`, which grants full company management via existing RLS policies and `isCompanyAdmin` checks.

### 3. Verify RLS works without `user_roles.admin`

Company owners can manage their data because RLS policies check BOTH:
- `has_role(auth.uid(), 'admin')` — platform admin path
- `company_users.company_role IN ('company_owner', 'company_admin')` — company admin path

Tables like `locations`, `employees`, `shifts` have policies that check company role, so company owners are NOT blocked.

## Risk

Low. We are removing an accidental privilege escalation. Company owners retain full company management through their `company_owner` role in `company_users`.

## Files changed

- 1 database migration (remove bad roles + revert onboarding RPC)

