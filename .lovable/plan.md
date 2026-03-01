

# Kiosk Layout Restructure: 3-Column Design

## Current Layout
The QR code lives in `AttendanceKiosk.tsx` as a separate panel (sidebar on desktop, top bar on tablet). The `KioskDashboard` is a 2-column grid: Left = Team + Tasks, Right = Champions + MTD Score.

## Proposed Layout

Move the QR code, Today's Team, and MTD Score into a **left sidebar column**. The remaining space becomes a **2-section area** with Today's Tasks (dominant) and Today's Champions (narrower).

```text
┌─────────────────────────────────────────────────────────────┐
│ Header: Location Name                        Clock / Date   │
├──────────┬──────────────────────────┬───────────────────────┤
│ QR Code  │                          │                       │
│ ───────  │   Today's Tasks          │  Today's Champions    │
│ Team (1) │   (large, dominant)      │  (narrower card)      │
│  • Staff │                          │                       │
│  • Staff │                          │                       │
│ ───────  │                          │                       │
│ MTD Score│                          │                       │
│  1. Name │                          │                       │
│  2. Name │                          │                       │
└──────────┴──────────────────────────┴───────────────────────┘
```

On tablet (< xl), it stacks: QR bar at top, then a single-column layout with Team, Tasks, Champions, MTD.

## Changes

### File 1: `src/pages/AttendanceKiosk.tsx`

**Move QR code into the KioskDashboard component** by passing QR-related props (qrData, countdown, kiosk info) into KioskDashboard instead of rendering the QR panel separately in AttendanceKiosk. This allows KioskDashboard to control the full 3-column layout internally.

Alternatively (simpler approach): Keep the QR in AttendanceKiosk as the left sidebar, but **also move Today's Team and MTD Score out of KioskDashboard and into that same sidebar**. This avoids splitting dashboard data across components.

**Recommended approach**: Keep the QR panel in AttendanceKiosk but expand it to include Team + MTD. Pass these as render props or children from KioskDashboard.

Actually, the cleanest approach: **Pass QR data into KioskDashboard** and let KioskDashboard own the entire layout — QR + Team + MTD in left column, Tasks + Champions in the main area.

### File 1: `src/pages/AttendanceKiosk.tsx`
- Remove the standalone QR panel from AttendanceKiosk
- Pass `qrData`, `countdown`, `currentTime` as new props to `KioskDashboard`
- KioskDashboard renders the full layout including QR

### File 2: `src/components/kiosk/KioskDashboard.tsx`
- Add new props: `qrData`, `countdown`
- Restructure the grid from 2-column to 3-column on large screens:
  - **Left column** (~300px fixed): QR code card at top, Today's Team below, MTD Score at bottom — all with internal ScrollArea, fitting the screen height
  - **Center column** (flex-1, ~60% of remaining): Today's Tasks — dominant, fills height
  - **Right column** (~30% of remaining): Today's Champions — narrower, fills height
- On tablet (< xl): stack vertically — QR bar, KPIs, Team, Tasks, Champions, MTD
- All columns use `overflow-hidden` + `ScrollArea` so everything fits any screen without page-level scrolling

## What stays the same
- All data fetching, hooks, task pipeline, KPIs, champions, MTD logic — zero changes
- QR generation logic stays in AttendanceKiosk, just passes data down
- Footer status bar stays in AttendanceKiosk
- Header stays in AttendanceKiosk

