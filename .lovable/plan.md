

## Fix: Payroll Batch Not Filtering by Location

### Root Cause
The edge function `workforce-agent` appears to not be using the latest deployed code. Despite the source code having the `location_id` filter at line 69-70 and saving it at line 207, the edge function logs show no location being passed. This is likely a deployment sync issue — the edge function needs to be redeployed.

Additionally, I'll add more explicit logging to help debug in the future, and ensure the `location_id` is being properly received and passed through.

### Plan

#### 1. Force Edge Function Redeploy with Better Logging
**File: `supabase/functions/workforce-agent/index.ts`**

Add explicit logging of the received `location_id` at the route handler level (line 585) to verify it's being parsed:
```typescript
console.log(`[WorkforceAgent] prepare-payroll params: company=${company_id}, start=${period_start}, end=${period_end}, location=${location_id || 'ALL'}`);
```

This will force a redeploy and provide visibility into whether `location_id` is reaching the handler.

#### 2. Defensive Check in `preparePayroll` Function
Ensure the `location_id` parameter isn't silently dropped. Add a guard log at the top of `preparePayroll()`.

#### 3. Verify the Fix
After redeployment, create a new payroll batch for "Bab's Obor" and confirm:
- Edge function logs show the location_id
- The batch record has `location_id` set
- Employee count matches the 3 active employees at Bab's Obor (not 58)

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/workforce-agent/index.ts` | Add explicit location_id logging at route handler + in preparePayroll function to force redeploy and improve observability |

