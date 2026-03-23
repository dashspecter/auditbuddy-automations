

# Rethink: Chat-First Layout for Both Dash Views

## Current Problem

**DashPanel (dialog view — screenshot 1):** History and Saved Workflows are stacked above the chat, consuming ~200px of vertical space in a 680px dialog. The chat area is cramped before the user even starts.

**DashWorkspace (expanded — screenshot 2):** The side rail (w-64 = 256px) is always visible and takes significant horizontal space. The chat — the primary interaction — is pushed right and feels secondary.

Both views violate the core principle: **the chat IS the product; everything else is secondary navigation.**

## Design

### DashPanel (dialog/sheet view)
- Remove inline History and Saved Workflows sections entirely from the chat content area
- Add a small "History" icon button in the header bar (next to Clear and Maximize)
- Clicking it opens a dropdown/popover showing recent sessions — not embedded in the main flow
- Saved Workflows becomes a slash-command or a small menu in the input bar
- Result: 100% of the dialog body is chat + input

### DashWorkspace (expanded /dash view)
- History sidebar is **collapsed by default** — just a thin icon strip or hidden entirely
- Add a toggle button (e.g., sidebar icon) in the header to show/hide the side rail
- When visible, the side rail overlays or pushes the chat (using a state toggle)
- On mobile, history stays behind a sheet/drawer trigger
- Result: chat gets the full width on first load; history is one click away

## Files to change

| File | Change |
|------|--------|
| `src/components/dash/DashPanel.tsx` | Remove inline History/Workflows; add History icon button with Popover; move Workflows to input area or remove |
| `src/pages/DashWorkspace.tsx` | Make side rail collapsible (hidden by default); add toggle button in header; persist preference optionally |
| `src/components/dash/DashInput.tsx` | Optionally add a workflows menu trigger (slash icon or bookmark icon) |

## Technical details

- Side rail toggle: `useState<boolean>(false)` — `sidebarOpen` controls visibility
- DashPanel history: Use `Popover` from shadcn wrapping `DashSessionHistory` — positioned from a header icon button
- No database changes needed
- Saved Workflows in DashPanel can be moved to a small popover attached to the input area, or simply removed from the panel view (it's always available in the expanded workspace)

