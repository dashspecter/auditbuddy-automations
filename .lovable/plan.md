

## Fix: Add Missing Module Names to Database CHECK Constraint

### Problem
The `company_modules` table has a CHECK constraint (`company_modules_module_name_check`) that restricts which `module_name` values can be inserted. It currently allows only 13 values and is missing 4 of the newly registered modules:

- `payroll`
- `cmms`
- `corrective_actions`
- `operations`

When you try to enable these modules from the settings page, the database rejects the insert with: *"new row for relation company_modules violates check constraint company_modules_module_name_check"*.

### Fix
Run a single database migration to drop the old constraint and recreate it with all 17 allowed values:

```sql
ALTER TABLE public.company_modules
  DROP CONSTRAINT company_modules_module_name_check;

ALTER TABLE public.company_modules
  ADD CONSTRAINT company_modules_module_name_check
  CHECK (module_name = ANY (ARRAY[
    'location_audits', 'staff_performance', 'equipment_management',
    'notifications', 'reports', 'workforce', 'documents',
    'inventory', 'insights', 'integrations', 'wastage',
    'qr_forms', 'whatsapp_messaging',
    'payroll', 'cmms', 'corrective_actions', 'operations'
  ]));
```

### Impact
- No code changes needed
- No data loss -- existing rows are unaffected
- The 4 modules that were previously failing to toggle on will now work correctly
- All other modules remain unchanged

