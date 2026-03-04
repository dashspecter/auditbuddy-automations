

# Evidence Review: Why Approved Packets Still Show "Pending Review"

## The Actual Situation

The RLS fix from the last edit **IS working**. The approval flow now correctly updates the database. Here's proof from the live DB:

```text
Subject 8bda8a7b (the one you approved):
  packet 14076db3 → status: approved  (Mar 3)  ✅ 
  packet 662493b1 → status: submitted (Mar 2)  ← still pending
  packet 29ae5a10 → status: submitted (Mar 1)  ← still pending
  packet dc5ba65b → status: submitted (Feb 27) ← still pending
```

**You approved 1 of 4 packets.** The other 3 are different daily submissions from the same recurring task. The list still shows "Pending review" because those 3 packets genuinely haven't been reviewed yet.

The approved packet (Mar 3) **did** move to "approved" status in the DB. But the list defaults to the "submitted" filter, so you only see the remaining unreviewed ones — which all look identical because the list only shows a truncated UUID with no task name or date context.

## Root Cause: Missing Context in the List

The Evidence Review table shows:
- **Type**: "Task Occurrence" (unhelpful — they're all the same)
- **Subject ID**: truncated UUID like `8bda8a7b…` (impossible to distinguish)
- **No task name**, no employee name, no occurrence date

So after approving one packet for task X on Mar 3, the remaining Mar 2, Mar 1, and Feb 27 packets for the same task look identical. You think you already reviewed it, but these are different days.

## Fix Plan

### 1. Enrich the list query with task name and employee name

Update `useAllEvidencePackets` in `EvidenceReview.tsx` to join with `tasks` (for task title) and `employees`/`profiles` (for submitter name). Replace the truncated UUID with human-readable info.

### 2. Show occurrence/submission date prominently

Add the submission date as a key identifier so users can tell "Mar 3" apart from "Mar 1".

### 3. Replace raw subject_id with task title

Instead of `8bda8a7b…`, show "Clean espresso machine" or whatever the task title is.

### 4. Show submitter name

Add a "Submitted by" column showing the employee who captured the evidence.

### 5. Add status count summary for approved tab

The status chips at the top already work. After this fix, clicking "approved: 6" will show the 6 approved packets, confirming they were saved correctly.

## Technical Details

**File: `src/pages/EvidenceReview.tsx`**

1. Update the query to join task title and employee name:
```sql
SELECT ep.*, 
  t.title as task_title,
  e.first_name || ' ' || e.last_name as submitter_name
FROM evidence_packets ep
LEFT JOIN tasks t ON ep.subject_type = 'task_occurrence' AND t.id = ep.subject_id
LEFT JOIN employees e ON e.user_id = ep.created_by AND e.company_id = ep.company_id
```

Since PostgREST can't do conditional joins, we'll do a secondary lookup for task names using a separate query or by fetching the title inline via a lightweight helper.

2. Update the table columns:
   - Replace "Subject ID" with "Task / Subject" showing the task title
   - Add "Submitted by" column with employee name
   - Keep the date column

3. Update the `EvidenceRow` type to include `task_title` and `submitter_name`.

**No database changes needed.** The approval flow is already working correctly.

