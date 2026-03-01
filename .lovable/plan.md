

# Kiosk Layout Redesign: Fixed QR + Tasks, Compact Team & Champions

## Problem
From the screenshots:
1. **Today's Team** and **Today's Champions** cards use `flex-1` making them take equal space even with just 3 employees or 0 champions — huge empty cards waste screen real estate
2. The **QR code** is at the bottom-left corner, easy to miss — staff have to scroll/search for it
3. **Today's Tasks** list (the most important section) shares space equally with Team/Champions, getting squeezed

## Solution

### Restructure the grid layout in `KioskDashboard.tsx`

**Current layout** (2-column grid, each column has `flex-1` cards):
```text
┌──────────────────┬──────────────────┐
│ Today's Team     │ Today's Champions│
│ (flex-1, huge)   │ (flex-1, huge)   │
├──────────────────┼──────────────────┤
│ Today's Tasks    │ MTD Score        │
│ (flex-1)         │ (flex-1)         │
└──────────────────┴──────────────────┘
```

**New layout** — Team & Champions shrink-to-fit, Tasks gets remaining space:
```text
┌──────────────────┬──────────────────┐
│ Today's Team     │ Today's Champions│
│ (auto height,    │ (auto height,    │
│  max-h capped)   │  max-h capped)   │
├──────────────────┼──────────────────┤
│ Today's Tasks    │ MTD Score        │
│ (flex-1, fills   │ (flex-1, fills   │
│  remaining space)│  remaining space)│
└──────────────────┴──────────────────┘
```

### Changes to `KioskDashboard.tsx` (lines 637-915)

1. **Today's Team card** (line 641): Change from `flex-1` to `shrink-0` with a `max-h-[40%]` cap. When there are only 3 employees, the card is compact. With many employees, it scrolls within the capped height.

2. **Today's Champions card** (line 819): Same treatment — `shrink-0` with `max-h-[40%]`. With 0 champions, the empty state is small (reduce `py-8` to `py-3`).

3. **Today's Tasks card** (line 709): Keep `flex-1` so it expands to fill all remaining vertical space — always visible, always prominent.

4. **MTD Score card** (line 867): Keep `flex-1` to fill remaining space in the right column.

### Changes to `AttendanceKiosk.tsx`

5. **QR code panel**: Already fixed from the previous change (compact top bar on tablet). No additional changes needed — the QR is already always visible at the top on tablet.

### What stays the same
- All data fetching, hooks, task pipeline, KPIs, champions logic — zero changes
- Desktop large-screen behavior preserved (just better proportioned)
- QR generation, attendance, shift logic — untouched
- Mobile/responsive breakpoints from previous fix — preserved

