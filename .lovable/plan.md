

## Enable Multi-Role Selection in Task Edit (Match Task Creation)

### What
Update the Task Edit page to support selecting multiple roles -- exactly matching the Task Creation page's multi-role chip UI. Currently, editing a task only allows picking a single role via a dropdown, while creation allows multiple roles via a chip-based selector.

### Changes

**File: `src/pages/TaskEdit.tsx`**

1. **Change state from single to multi-role**:
   - Replace `assigned_role_id: ""` (string) with `assigned_role_ids: []` (string array) in `formData`
   - When loading existing task data, fetch the task's roles from the `task_roles` junction table and populate the array (falling back to the legacy `assigned_role_id` field if no junction rows exist)

2. **Replace the single-select dropdown with the multi-role chip UI**:
   - Show selected roles as removable chips (same as TaskNew)
   - Show available (unselected) roles as clickable buttons below (same as TaskNew)
   - Remove the old `<Select>` component for role

3. **Update the Completion Type toggle visibility**:
   - Show "Shared vs Individual" toggle when `assigned_role_ids.length > 0` instead of checking a single `assigned_role_id`

4. **Update the save/submit handler**:
   - Set `assigned_role_id` to the first selected role (for backward compatibility with the tasks table column)
   - After updating the task row, sync the `task_roles` junction table: delete existing rows for this task, then insert new rows for all selected role IDs

**File: `src/hooks/useTasks.ts`**

5. **Enhance `useUpdateTask`** to accept an optional `assigned_role_ids` array:
   - Strip `assigned_role_ids` from the direct table update (it's not a column on `tasks`)
   - After updating the task, delete old `task_roles` rows and insert new ones if `assigned_role_ids` is provided

### Technical Details
- The `task_roles` junction table (columns: `id`, `task_id`, `role_id`, `created_at`) is already used by the create flow
- The `tasks.assigned_role_id` column will continue to hold the first/primary role for backward compatibility
- No database migrations needed -- the junction table already exists
- The UI will be an exact copy of the multi-role selector in TaskNew.tsx

