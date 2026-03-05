

# Analysis: PROPER PIZZA User Not Showing in Company Users List

## What's Happening

Two separate issues visible in your screenshots:

### Issue 1: User card shows blank name/email
The PROPER PIZZA owner (`daniel.proper25@gmail.com`) has **no profile record** in the `profiles` table. The Company Users list fetches profile data (name, email) from the `profiles` table, so the card renders with empty text. The user card IS there (you can see the Owner dropdown and checkboxes), but name/email are blank.

**Root cause**: The `create_company_onboarding` RPC creates the company and `company_users` record, but **never creates a profile** for the user. There is also no trigger on `auth.users` to auto-create profiles on signup. Fresh Brunch profiles exist because they were created through the `create-user` edge function which explicitly upserts profiles.

This affects 4 companies: PROPER PIZZA, BenStone SRL, Naturacreta, and Test Comp — all have `NULL` profile data.

### Issue 2: "User is already a member" error on invite
This is **correct behavior**. `daniel.proper25@gmail.com` is already the `company_owner` of PROPER PIZZA. The invite flow correctly detects this and rejects the duplicate. The user doesn't need to be re-invited — they just need their profile record created so their name shows up.

## The Fix (2 changes)

### 1. Fix the onboarding RPC to create a profile on company creation

Add a profile upsert inside `create_company_onboarding`:

```sql
-- After inserting into company_users, ensure profile exists
INSERT INTO public.profiles (id, email, full_name)
SELECT v_user_id, u.email, u.raw_user_meta_data->>'full_name'
FROM auth.users u WHERE u.id = v_user_id
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
```

### 2. Backfill missing profiles for existing users

One-time data fix to create profile records for the 4 affected users:

```sql
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
```

### What stays unchanged
- Company Users UI component (already handles profiles correctly)
- Invite flow (working as designed)
- All RLS policies
- All other hooks and pages

**1 migration file. 0 frontend changes.**

