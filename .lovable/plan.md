

## Remaining Work: Shift Scheduling — A to Z

Everything implemented so far has been verified. Here is what remains.

---

### 1. Fix: StaffShiftPool does not filter for Open shifts

**Current bug:** `StaffShiftPool.tsx` (line 84-105) loads ALL shifts from the database and only checks if `shift_assignments.length < required_staff`. It does NOT filter by `is_open_shift = true` or `status = 'open'`. This means employees can see and claim **Draft** and **Published** (assigned) shifts — not just Open ones.

**Fix:** Add `.eq("is_open_shift", true)` to the query at line 87-92 and also add `.eq("is_published", true)` to ensure draft shifts are excluded. This is a 2-line addition.

**File:** `src/pages/staff/StaffShiftPool.tsx`

---

### 2. Fix: Claim creates assignment without `approval_status`

**Current bug:** The `claimShift` function (line 166-172) inserts into `shift_assignments` without setting `approval_status`. If the column defaults to `NULL` or `'approved'` instead of `'pending'`, claimed shifts could bypass manager approval.

**Fix:** Explicitly set `approval_status: 'pending'` in the insert payload.

**File:** `src/pages/staff/StaffShiftPool.tsx`

---

### 3. Fix: StaffShiftPool duplicate-day filter

**Current behavior:** The claim function (line 138-163) correctly checks for time overlaps before allowing a claim. However, the **listing** does not exclude shifts on days where the employee already has a shift. Per the original plan spec: "Open shifts appear only to employees who don't already have a shift on that day/date."

**Fix:** After fetching open shifts, also fetch the employee's existing assignments for those dates and filter out shifts on dates where the employee already has an approved/pending assignment. This is a client-side post-filter.

**File:** `src/pages/staff/StaffShiftPool.tsx`

---

### 4. Update memory: shift-status-governance

The stored memory about the `sync_shift_publish_status` trigger is outdated — it doesn't mention the `'open'` status. This should be updated to reflect the new Draft / Open / Published model.

---

### Implementation Order

| Step | Description | File |
|------|-------------|------|
| 1 | Add `is_open_shift=true` and `is_published=true` filters to StaffShiftPool query | `src/pages/staff/StaffShiftPool.tsx` |
| 2 | Set `approval_status: 'pending'` explicitly in claim insert | `src/pages/staff/StaffShiftPool.tsx` |
| 3 | Filter out shifts on dates where employee already has a shift | `src/pages/staff/StaffShiftPool.tsx` |
| 4 | Update shift-status-governance memory | Memory update |

All changes are in a single file (`StaffShiftPool.tsx`) plus a memory update. No database migrations needed.

