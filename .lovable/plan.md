
# Deep Audit: Proper Pizza Account Readiness — COMPLETED

## Applied Fixes

### 1. ✅ Backfilled Admin Roles for All Company Owners
4 company owners were missing the `admin` role in `user_roles`. All now have it:
- PROPER PIZZA (Daniel Popescu) ✅
- Test Comp ✅
- Naturacreta ✅
- BenStone SRL ✅
- Fresh Brunch SRL (already had it) ✅

### 2. ✅ Fixed Onboarding RPC
`create_company_onboarding` now inserts `admin` role in `user_roles` after creating the company owner. Future accounts won't hit this issue.

### 3. ✅ Set Proper Pizza to Enterprise Tier
- subscription_tier: `enterprise`
- trial_ends_at: 14 days from now (March 19, 2026)

### 4. ✅ Cross-Company Data Leak Fixed (Previous Migration)
Dropped `Public can view locations` and `Public can view departments` policies.

## Verification Status
- All company owners have admin role ✅
- Proper Pizza on enterprise tier with trial ✅
- Data isolation confirmed ✅
- Onboarding RPC patched for future accounts ✅
