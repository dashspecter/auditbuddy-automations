

# Fix Kiosk View to Viewport Height

## Problem
The kiosk page container (`src/pages/AttendanceKiosk.tsx` line 230) uses `min-h-screen` which allows content to grow beyond the viewport, causing page-level scrolling. The kiosk should be locked to the device height with only internal sections scrolling.

## Fix — 1 line change

**`src/pages/AttendanceKiosk.tsx` line 230**: Change `min-h-screen` to `h-screen` so the outer container is clamped to exactly the viewport height. The inner `flex-1 overflow-hidden min-h-0` wrapper (line 255) and ScrollArea components inside KioskDashboard already handle internal scrolling — they just need the parent to have a fixed height constraint.

```
// Before:
<div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col">

// After:
<div className="h-screen bg-gradient-to-br from-background to-muted flex flex-col overflow-hidden">
```

Adding `overflow-hidden` on the root ensures no content leaks past the viewport boundary. All scrolling stays within the ScrollArea components (team list, task list, champions, MTD score).

