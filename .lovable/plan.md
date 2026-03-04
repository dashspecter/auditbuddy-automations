

# Evidence Review: Approved But Still "Pending Review" — Root Cause & Fix

## Root Cause

The problem is an **RLS policy mismatch**. Here is the full chain of what happens when a manager clicks "Approve":

```text
1. Mutation reads current packet status     → ✅ SELECT works (company membership)
2. Mutation UPDATEs packet status to        → ❌ SILENTLY BLOCKED by RLS (0 rows updated)
   "approved" + sets reviewed_by/at
3. Mutation INSERTs an evidence_event       → ✅ Works (only checks company membership)
   with event_type="approved"
4. UI shows "Approved" in activity log      → But packet.status is still "submitted"
```

**The UPDATE RLS policy** (`evidence_packets_update_reviewers`) only allows users whose `company_role` is one of: `company_owner`, `company_admin`, `company_manager`.

**User vlad@lbfc.ro** has:
- `company_role = company_member` (not in the allowed list)
- `platform role = manager` (in `user_roles` table)

So the platform manager role is completely ignored by the RLS policy. The UPDATE silently affects 0 rows (Supabase doesn't throw an error for this), the event still gets inserted, and the UI shows contradictory state.

**User doug@lebab.ro** (company_admin) — his approvals DO work because his company_role IS in the allowed list. This confirms the diagnosis.

## Fix Plan (2 changes)

### 1. Update RLS policy to include platform managers/admins

Update the `evidence_packets_update_reviewers` policy to also allow users with platform `manager` or `admin` roles via the existing `has_role()` helper:

```sql
DROP POLICY "evidence_packets_update_reviewers" ON public.evidence_packets;

CREATE POLICY "evidence_packets_update_reviewers"
  ON public.evidence_packets FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND (
          cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'manager'::app_role)
        )
    )
  );
```

### 2. Add error handling in mutation for silent RLS failures

In `useEvidencePackets.ts`, after the UPDATE call, verify that a row was actually updated. If not, throw an error so the user gets feedback instead of a false "Proof approved" toast.

### 3. Backfill: fix the 3 stuck packets

Run a data fix to update the 3 packets that were "approved" via events but still have `status = submitted`:

```sql
UPDATE evidence_packets 
SET status = 'approved', 
    reviewed_at = ee.created_at,
    reviewed_by = ee.actor_id
FROM (
  SELECT DISTINCT ON (packet_id) packet_id, actor_id, created_at 
  FROM evidence_events 
  WHERE event_type = 'approved' 
  ORDER BY packet_id, created_at DESC
) ee
WHERE evidence_packets.id = ee.packet_id 
  AND evidence_packets.status = 'submitted';
```

## Summary

| What | Detail |
|------|--------|
| Root cause | RLS UPDATE policy ignores platform roles (`manager`, `admin`) |
| Why silent | Supabase returns no error on 0-row UPDATE |
| Why events show "approved" | Events INSERT policy is more permissive |
| Fix | Widen RLS policy + add row-count check + backfill 3 stuck rows |

