

# Fix: Cross-Company Data Leak on Locations and Departments

## Problem

The kiosk recovery migration added two policies with `USING (true)`:
- `"Public can view locations"` — exposes ALL company locations to every user
- `"Public can view departments"` — exposes ALL company departments to every user

Proper Pizza (brand new, zero data) sees Fresh Brunch locations because these policies bypass company isolation entirely.

## Why kiosks won't break

Kiosk dashboards get location/department names through `SECURITY DEFINER` RPCs (`get_kiosk_by_token_or_slug`, `get_kiosk_employees`), which bypass RLS. They do **not** need direct table-level `SELECT` on `locations` or `departments`. The `attendance_kiosks` `TO public` policy (needed for shift subqueries) stays untouched.

## Fix — single migration, no code changes

```sql
DROP POLICY "Public can view locations" ON public.locations;
DROP POLICY "Public can view departments" ON public.departments;
```

Existing company-scoped policies already handle authenticated users:
- `"Users can view locations in their company"` — `company_id = get_user_company_id(auth.uid())`
- `"Users can view departments in their company"` — via `company_users` join

## Verification checklist

1. Proper Pizza sees zero locations, zero departments (correct — new account)
2. Fresh Brunch sees only LBFC locations and their departments
3. Fresh Brunch kiosk URLs still load with shifts, tasks, employees (RPCs unaffected)
4. Shift scheduling dropdowns show only own-company locations

## Risk

Zero — removing overly permissive policies while company-scoped policies remain intact. Kiosks use RPCs that bypass RLS.

