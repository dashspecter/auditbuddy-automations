

# Add User Limit Per Company (Platform Admin Feature)

## Current State

- The `companies` table has no `max_users` column
- The `pricingTiers.ts` config defines `maxUsers` per tier but it is never enforced
- User invites happen in two places: Company Settings invite dialog and the edge function that processes invites
- There is no server-side or client-side check against a user limit

## Plan

### 1. Database Migration
Add a `max_users` nullable integer column to `companies`:
```sql
ALTER TABLE public.companies ADD COLUMN max_users integer DEFAULT NULL;
```
`NULL` means unlimited. This gives platform admins per-company override control independent of the tier defaults.

### 2. Platform Admin UI — CompanyDetail page
In `src/pages/admin/CompanyDetail.tsx`, add a "User Limit" card/section near the stats area:
- Display current `max_users` value (show "Unlimited" if null)
- Editable input field with a Save button
- Platform admin can set any number or clear it for unlimited
- Show current user count vs. limit (e.g., "8 / 25 users")

### 3. Enforce Limit on Invite (Client-Side)
In `src/pages/CompanySettings.tsx`, before the invite mutation fires:
- Fetch the company's `max_users` value
- Compare against current `company_users` count
- If at or over the limit, show a toast error and block the invite
- Disable the "Invite User" button when at capacity

### 4. Enforce Limit on Invite (Server-Side)
In the edge function that processes invites (the one called by `inviteUserMutation`):
- Query the company's `max_users` and current user count
- Return a 403 with a clear error message if the limit would be exceeded
- This prevents bypassing the client-side check

### 5. Visual Indicator
On the Company Settings Users tab, show a usage indicator like "8 / 25 users" so company owners can see their capacity without needing to contact the platform admin.

## Files to Change
- **Migration**: New `max_users` column on `companies`
- `src/pages/admin/CompanyDetail.tsx` — add user limit editor
- `src/pages/CompanySettings.tsx` — enforce limit on invite, show usage
- Edge function for invite — server-side enforcement

