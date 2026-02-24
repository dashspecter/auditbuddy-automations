
The "Photo Confirmation" requirement is correctly implemented as an opt-in feature per task template. However, my investigation revealed that the "evidence gate" (the logic that checks for a photo before allowing completion) is only present in one specific view (`StaffTasks.tsx`) and is currently missing from others. Furthermore, the existing implementation in `StaffTasks.tsx` has a bug where it fails to identify policies for recurring tasks because it uses the occurrence ID instead of the original task template ID.

I will implement a consistent enforcement of the photo confirmation feature across all task completion interfaces.

### Proposed Changes

#### 1. Fix Evidence Gate for Recurring Tasks in `StaffTasks.tsx`
- Update the evidence policy query to use a resolved ID (the base task UUID). This ensures that recurring tasks correctly trigger the photo requirement if it's enabled on the template.
- Import `getOriginalTaskId` from the task engine to handle ID resolution consistently.

#### 2. Enforce Evidence Gate in `ActiveTasksCard.tsx` (Dashboard Widget)
- Integrate the evidence gate check before the completion mutation.
- Add state management to track when a task is "locked" behind an evidence requirement.
- Render the `EvidenceCaptureModal` when a photo is required but missing.
- Ensure that once the photo is captured, the task automatically completes as expected.

#### 3. Enforce Evidence Gate in `Tasks.tsx` (Manager Task List)
- Add the same check-and-capture logic to the manager-side completion handler.
- Even if a manager is completing the task, they will be prompted for proof if the policy requires it, maintaining compliance across all user roles.

### Technical Details

- **ID Resolution**: I will use `getOriginalTaskId()` to strip prefixes like `-virtual-` or `-completed-` from task IDs when querying the `evidence_policies` table.
- **Evidence Logic**:
  1. Before completion: Query `evidence_policies` where `applies_to='task_template'` and `applies_id=originalTaskId` and `evidence_required=true`.
  2. If a policy exists, check if a valid (submitted or approved) packet already exists in `evidence_packets` for this occurrence.
  3. If no valid packet exists, open the `EvidenceCaptureModal` and pause the completion.
  4. After successful capture, resume the completion with a "skip" flag to avoid an infinite loop.

### User Experience
- This change will **only** affect tasks where "Photo Confirmation" (or other evidence) has been explicitly enabled in the task template settings.
- Standard tasks without this requirement will continue to complete with a single tap as they do now.

