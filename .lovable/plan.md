

# Phase 7: Bug Fixes + Final Extraction — Pure Orchestration `index.ts`

## Critical Bugs Found

### Bug 1: `parse_uploaded_file` has no case in the switch
The `case "parse_uploaded_file"` was **lost during Phase 6 migration**. When the LLM calls this tool, it hits `default` and returns `"Unknown tool: parse_uploaded_file"`. This breaks all file upload workflows — audit template from PDF, compliance doc parsing, ID card scanning. This is a **P0 regression**.

### Bug 2: Duplicate `search_locations` case
Lines 310-313 have the old inline `search_locations` (direct DB query without company scoping). Lines 317-318 have the new capability call. The first case shadows the second — meaning the company-scoped version never executes.

---

## What This Phase Delivers

1. **Fix both bugs immediately**
2. **Extract remaining inline tools** into capability modules — finishing the migration
3. **Get `index.ts` to ~600 lines** of pure orchestration (auth, LLM loop, SSE, routing)

## Remaining Inline Code in `executeToolInner` (lines 382-818)

| Block | Lines | Description | Action |
|-------|-------|-------------|--------|
| Memory tools | 382-452 | `save_user_preference`, `get_user_preferences`, `save_org_memory`, `get_org_memory`, `save_workflow`, `list_saved_workflows` | Extract → `capabilities/memory.ts` |
| File transforms | 454-538 | `transform_spreadsheet_to_schedule`, `transform_sop_to_training`, `transform_compliance_doc_to_audit` | Extract → `capabilities/file-processing.ts` |
| `parse_uploaded_file` | **MISSING** | Was inline before Phase 6, now gone | Restore into `capabilities/file-processing.ts` |
| Time-off orchestration | 541-818 | Draft/execute wiring for time-off (wraps capability calls with pending action logic) | Extract → `capabilities/time-off-orchestration.ts` or keep inline (it's orchestration, not domain logic) |

## Implementation

### Step 1: Fix `parse_uploaded_file` (P0)
Find the `parse_uploaded_file` logic from git history / previous implementation. It's an AI-driven file parser that:
- Downloads file via `downloadFileAsBase64`
- Sends to Gemini with intent-specific prompts (`audit_template`, `compliance_audit`, `id_card`)
- Returns structured extraction
- For audit intents: auto-creates a draft via `createAuditTemplateDraft`

Add it to `capabilities/file-processing.ts` alongside the existing transform tools.

### Step 2: Fix duplicate `search_locations`
Remove lines 310-313 (old inline case). The capability version at line 317-318 is correct.

### Step 3: Extract memory tools → `capabilities/memory.ts`
Move `save_user_preference`, `get_user_preferences`, `save_org_memory`, `get_org_memory`, `save_workflow`, `list_saved_workflows` into a new file. These are simple CRUD — straightforward extraction.

### Step 4: Extract file processing → `capabilities/file-processing.ts`
Move `transform_spreadsheet_to_schedule`, `transform_sop_to_training`, `transform_compliance_doc_to_audit`, and the restored `parse_uploaded_file` into one module. Pass `downloadFileAsBase64` as a dependency or move it there too (it's only used by file processing).

### Step 5: Simplify time-off orchestration
The time-off cases (lines 541-818) are orchestration code — they wrap capability calls with pending action management and structured events. Two options:
- **Option A**: Keep inline — it's orchestration, not domain logic
- **Option B**: Extract the draft/execute pattern into a shared orchestration helper

I recommend **Option A** for now, with a note that Phase 8 could introduce a generic draft/execute orchestration helper that all domains share.

### Step 6: Update registry
Add `memory` and `file_processing` entries to `registry.ts`.

## Result

After this phase:
- `executeToolInner` is ~30 one-liner routing cases + time-off orchestration (~280 lines)
- `index.ts` total: ~700 lines (down from 2342 original, 1342 current)
- **Zero inline domain logic** — everything in capability modules
- All file upload workflows work again
- `search_locations` correctly scoped to company

## Files Created/Modified

| File | Action |
|------|--------|
| `capabilities/memory.ts` | **New** — 6 memory/workflow tools |
| `capabilities/file-processing.ts` | **New** — 3 transform tools + `parse_uploaded_file` + `downloadFileAsBase64` |
| `index.ts` | **Modified** — remove inline tools, fix duplicate case, add routing |
| `registry.ts` | **Updated** — add memory + file_processing entries |

