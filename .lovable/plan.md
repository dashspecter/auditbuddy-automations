

# Fix: Dash comparison data renders as unreadable raw text

## Problem

The audit comparison data is correct but renders as a single line of pipe-delimited text (screenshot). Two root causes:

1. **`remark-gfm` is not installed** — ReactMarkdown without this plugin cannot parse GFM tables (pipe syntax). Tables render as raw text.
2. **No `data_table` structured event** — The backend comparison tool returns data as plain text to the LLM, which formats it as a markdown table. But even if remark-gfm worked, SSE streaming can collapse newlines, breaking table formatting.

## Fix — Two-pronged approach

### 1. Install `remark-gfm` and enable it in ReactMarkdown
This makes ALL markdown tables from Dash render properly — not just comparisons.

**File: `src/components/dash/DashMessageList.tsx`**
- Import `remarkGfm` from `remark-gfm`
- Add `remarkPlugins={[remarkGfm]}` to the `<ReactMarkdown>` component
- Add table-specific prose styles for proper borders, padding, striping

### 2. Emit `data_table` structured events from comparison tools
For the `compare_location_performance` tool, emit a `data_table` structured event with columns `["Location", "Avg Score", "Audits", "Min", "Max"]` and rows as arrays. This guarantees a clean rendered table via `DataTableCard` regardless of markdown parsing.

**File: `supabase/functions/dash-command/index.ts`**
- In the compare tool's return path, emit a `data_table` SSE event before returning the text summary
- Same for `get_audit_results` — emit tabular data as a structured event
- Same for `get_cross_module_summary` when it has audit breakdown data

This way: structured events render as clean `DataTableCard` components, and any other markdown tables the LLM writes also render correctly via remark-gfm.

