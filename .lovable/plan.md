

# Fix: Make Dash-Created Audit Templates Active and Visible

## What changes

Two lines in `supabase/functions/dash-command/index.ts`:

1. **Line 1435**: `is_active: false` → `is_active: true`
2. **Line 1436**: `is_global: false` → `is_global: true`
3. **Line 1522**: Update success message from "created as inactive draft. Ready to activate in Audit Templates." → "created successfully! You can find it in Audit Templates."

After this, any audit template approved through Dash will immediately appear in the Audit Templates list under "All Templates" and "Global Templates."

## File to change

| File | Change |
|------|--------|
| `supabase/functions/dash-command/index.ts` | Set `is_active: true`, `is_global: true`, update success message |

## Redeploy

The `dash-command` edge function will be redeployed after the change.

