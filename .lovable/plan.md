

# Add Search Bar to Task List

## What
Add a search input to the Tasks page that filters tasks by title in real-time. It will sit alongside the existing Location/Role/Employee filters and apply across all tabs (List, Today, Tomorrow, Pending, Overdue, Completed).

## How

### `src/pages/Tasks.tsx`
1. Add a `searchQuery` state variable
2. Add a search `Input` with a `Search` icon, placed at the start of the existing filter row (line ~640)
3. Update the `filterTasks` helper to also match `task.title` against the search query (case-insensitive)
4. Update `filteredStats` to reflect search-filtered counts
5. Include search in the "Clear" button reset logic

The search will be a simple `includes` match — fast, no debounce needed for 85 tasks. It filters the same `filterTasks` function all tabs already use, so every view gets search automatically.

### Files Changed

| File | Change |
|---|---|
| `src/pages/Tasks.tsx` | Add search state, search input in filter bar, update `filterTasks` to match title |

No database or backend changes needed.

