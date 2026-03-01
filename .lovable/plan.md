

# Kiosk Tablet Layout Improvements

## Problem
The kiosk page (`AttendanceKiosk.tsx`) uses a fixed `w-[400px]` side panel for the QR code plus a 2-column dashboard grid in the remaining space. On a tablet (~768-1024px), this creates a cramped 3-column feel where the QR code is hard to find, tasks are squeezed, and the MTD leaderboard is barely readable (visible in the screenshots).

## Approach
Make the layout responsive for tablet-sized screens while keeping the current desktop layout untouched.

### File 1: `src/pages/AttendanceKiosk.tsx`
- Change the main content area from a fixed side-by-side layout to a responsive one:
  - **Desktop (>=1280px)**: Keep current layout — QR on left (400px), dashboard on right
  - **Tablet (<1280px)**: Stack vertically — compact QR section on top (smaller QR, horizontal layout), full-width dashboard below
- Reduce the QR panel's visual weight on tablet: show QR + countdown in a compact horizontal row instead of a tall vertical card

### File 2: `src/components/kiosk/KioskDashboard.tsx`
- Change the main content grid from always `grid-cols-2` to responsive: `grid-cols-1 lg:grid-cols-2`
- On tablet, sections (Team, Tasks, Champions, MTD) stack vertically in a single scrollable column, making everything readable and accessible
- Staff list and task list get more horizontal space, so task titles aren't truncated

### What stays the same
- All data fetching, hooks, task pipeline, KPIs, champions logic, MTD scoring — zero changes
- Desktop layout on large screens is preserved
- Footer status bar unchanged
- QR generation/refresh logic unchanged

