

# Fix 5 Remaining P2 Defense-in-Depth Issues

All fixes follow the same pattern: add `.eq("company_id", companyId)` to read queries that already receive `companyId` but don't use it.

---

## Fix 1 — `operations.ts:getTaskCompletionSummary` (line 13)
`task_completions` likely lacks a direct `company_id` column (it joins through `tasks`). Since we can't filter nested relations with `.eq()` on the parent, we add a post-query note. However, `tasks` table does have `company_id` — but the query selects from `task_completions` not `tasks`. The safest approach: if `task_completions` has no `company_id`, we cannot add the filter at this level (RLS handles it). **Skip or verify schema first.**

Actually — let me check: all these tables likely have `company_id`. The pattern across the codebase (documents, corrective_actions, cmms_work_orders) suggests they do. The fix is straightforward for tables that have the column.

## Fix 2 — `operations.ts:getWorkOrderStatus` (line 24)
Add `.eq("company_id", companyId)` to the `cmms_work_orders` query.

## Fix 3 — `operations.ts:getTrainingGaps` (line 51)
Add `.eq("company_id", companyId)` if `training_assignments` has the column, otherwise filter via employee join.

## Fix 4 — `corrective-actions.ts:getOpenCorrectiveActions` (line 17)
Add `.eq("company_id", companyId)` to the `corrective_actions` query.

## Fix 5 — `memory.ts:listSavedWorkflows` (line 78-85)
Add `companyId` parameter, add `.eq("company_id", companyId)` before `.or()`. Update call site in `index.ts:343` to pass `companyId`.

---

## Files Modified

| File | Change |
|------|--------|
| `capabilities/operations.ts` | Add `.eq("company_id", companyId)` to `getWorkOrderStatus` and `getTrainingGaps`; for `getTaskCompletionSummary` add if column exists |
| `capabilities/corrective-actions.ts` | Add `.eq("company_id", companyId)` to `getOpenCorrectiveActions` read query |
| `capabilities/memory.ts` | Add `companyId` param to `listSavedWorkflows`, add `.eq("company_id", companyId)` |
| `index.ts` | Update `listSavedWorkflows` call to pass `companyId` |

