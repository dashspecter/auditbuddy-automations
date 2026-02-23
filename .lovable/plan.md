

## Fix "Show No Coverage" Button and Align "Recurring Only"

### Issue 1: "Show No Coverage" Button

The button labeled "Show No Coverage" is actually working correctly -- it toggles between "Planning mode" (shows all tasks including those with no shift coverage) and "Execution mode" (shows only tasks covered by scheduled shifts). The confusion is that its label doesn't clearly convey what it does.

Additionally, there's a dead `showNoCoverage` state variable that was never connected to any UI -- it should be cleaned up.

**Fix**: Rename the button labels to be clearer:
- When in Planning mode (showing all): label becomes **"All Tasks"** (active/filled style)
- When in Execution mode (covered only): label becomes **"Covered Only"** (active/filled style)
- Add a clearer tooltip explaining the toggle

Also remove the unused `showNoCoverage` state variable (line 267).

### Issue 2: "Recurring Only" Button Alignment

The "Recurring Only" button is in the same `flex-wrap` row as the dropdowns but uses a `&nbsp;` label spacer to try to align vertically. On wider screens it floats far to the right, disconnected from the filter dropdowns. 

**Fix**: Move both the "Recurring Only" and "Show No Coverage" toggle buttons into the same row but aligned properly using `items-end` on the flex container so buttons without labels align to the bottom of the row naturally, removing the `&nbsp;` label hack.

### Technical Changes

**File**: `src/components/tasks/AllTasksOpsDashboard.tsx`

1. **Remove dead state** (line 267): Delete `const [showNoCoverage, setShowNoCoverage] = useState(true)`

2. **Fix flex container alignment** (line 442): Change from `flex flex-wrap gap-3` to `flex flex-wrap gap-3 items-end` so buttons without labels align to the bottom

3. **Remove `&nbsp;` label hacks** (lines 539, 553): Remove the empty label spacers from the Recurring Only and View Mode toggle wrappers

4. **Improve button labels** (lines 568-570): Make the view mode toggle text clearer -- "All Tasks" vs "Covered Only"

Small, safe changes. No logic changes to filtering. No database impact.
