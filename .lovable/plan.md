

# Fix: Invite Button Should Open Users Tab

## Problem
The "Invite team members" button navigates to `/settings/company` which lands on the "General" tab. The Users tab (where you actually invite people) requires `?tab=users`.

## Fix
Single line change in `src/components/dashboard/CompanySetupChecklist.tsx`:

Change path from `"/settings/company"` to `"/settings/company?tab=users"`.

