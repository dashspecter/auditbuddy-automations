

# Fix: Assigned users (like Vlad) can't complete audits — RLS too restrictive

## The Problem

When a manager schedules an audit and assigns it to Vlad, two things happen:
1. A `location_audits` row is created with `user_id = manager_id` and `assigned_user_id = vlad_id`
2. When Vlad opens the audit (via calendar or audit list), he loads that row as his draft (`currentDraftId = that row's id`)

When Vlad then tries to save field responses, the RLS INSERT policy on `audit_field_responses` requires:
```
location_audits.user_id = auth.uid()
```
Since `user_id = manager_id` and Vlad's `auth.uid() = vlad_id`, **the INSERT is blocked**.

The same issue blocks Vlad from saving section responses (`audit_section_responses`) and updating the audit status on `location_audits` (unless he has a manager role).

## What about scoring and CAPAs?

The `LocationAudit.tsx` page (the desktop audit flow) **already has correct scoring and CAPA logic**:
- Score is calculated as `Math.round((totalRatings / (ratingCount * 5)) * 100)` — a proper percentage
- CAPA rules are fired via `process-capa-rules` for each scorable field after submission
- `recompute_audit_section_scores` is triggered automatically by a database trigger on `audit_field_responses` INSERT/UPDATE/DELETE

So scoring and CAPAs **do not need code changes** — they are already correct in the LocationAudit flow. The only thing preventing them from running is that the field responses can't be saved due to RLS.

The `PerformAudit.tsx` page (the new audit system using the `audits` table) is a separate, currently unused system — it has no data in its table and no navigation path leads to it from the active flows. It does NOT need fixing right now.

## The Fix — Database Only (4 RLS policy updates)

### 1. `audit_field_responses` INSERT policy
Add `OR location_audits.assigned_user_id = auth.uid()` to allow assigned users to create responses.

### 2. `audit_field_responses` UPDATE (own) policy
Same change — allow assigned users to update their own responses.

### 3. `audit_section_responses` INSERT policy
Same change — allow assigned users to create section responses.

### 4. `audit_section_responses` UPDATE (own) policy
Same change — allow assigned users to update their own section responses.

### 5. `location_audits` UPDATE (own) policy
Add `OR assigned_user_id = auth.uid()` so assigned users can update the audit status (submit, mark in_progress, etc.).

```text
Before:  user_id = auth.uid()
After:   (user_id = auth.uid() OR assigned_user_id = auth.uid())
```

All policies maintain:
- `auth.uid() = created_by` requirement on INSERT (you own the response row)
- Company-level isolation via `locations.company_id = get_user_company_id(auth.uid())` on manager policies
- No changes to SELECT policies (already correct — they check both `user_id` and `assigned_user_id`)
- No changes to DELETE policies
- No changes to manager-level policies (already broader)

## Impact Analysis — What else could be affected?

| Surface | Impact | Risk |
|---------|--------|------|
| Existing audits created by the user themselves | None — `user_id = auth.uid()` still matches as before | Zero |
| Recurring scheduled audits (process-recurring-audits) | These set `user_id = assigned_user_id`, so already work. The fix is additive safety for edge cases. | Zero |
| Manually scheduled audits (ScheduleAuditDialog) | These set `user_id = scheduler`, `assigned_user_id = performer`. **This is exactly the broken case the fix addresses.** | Positive |
| Staff mobile audits (StaffLocationAudit) | This flow stores data in `custom_data` JSON on `location_audits`, NOT in `audit_field_responses`. Unaffected. | Zero |
| Manager/admin UPDATE policies | Already check `has_role('manager')` — unaffected | Zero |
| Cross-tenant isolation | Still enforced via `company_id` checks on all broader policies | Zero |
| PerformAudit (new system) | Unused — `audits` table is empty, no navigation leads there | Zero |

## No code changes needed

- Scoring logic in `LocationAudit.tsx` is already correct (percentage-based)
- CAPA trigger (`process-capa-rules`) is already called on submit
- `recompute_audit_section_scores` fires automatically via database trigger
- Field response saving code already sets `created_by: user.id` correctly

## Testing plan after fix

**Backend verification:**
- Run the existing RLS Integration Tests (the `rls-integration-test` edge function already in the project) to confirm no cross-tenant leaks

**End-to-end UI verification:**
1. Log in as a manager, schedule an audit assigned to Vlad
2. Log in as Vlad, open the scheduled audit from the calendar
3. Fill in field responses (rating + yes/no fields) — should save without RLS error
4. Submit the audit — should complete with correct percentage score
5. Verify a corrective action is generated if score < threshold
6. Verify the audit appears in completed audits with correct score
7. Verify a different company's user still CANNOT access Vlad's audit data

