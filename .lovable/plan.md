

# Diagnosis: QR Scanner Black Screen on Android

## What's Happening
The screenshot shows the QR scanner overlay opened on top of the attendance page. The camera permission was granted and the scanner reports "started successfully" (no error message, no loading spinner), but the camera feed renders as a **solid black rectangle**. The underlying page content ("Attendance", "Today's Status") bleeds through because the overlay uses `bg-black/90` (90% opacity) instead of fully opaque.

This is a known issue with the `html5-qrcode` library on Android WebView/Capacitor — the camera stream starts but the `<video>` element inside the scanner div doesn't render frames properly due to CSS/sizing issues.

## Root Causes
1. **Video element sizing**: `html5-qrcode` injects a `<video>` element into the scanner div, but its dimensions may collapse to 0 or be clipped by the container's `overflow-hidden` + `rounded-lg` combo on Android
2. **Overlay transparency**: `bg-black/90` lets the page behind show through, creating visual confusion — user sees "Attendance" and "Today's Status" mixed with the scanner UI
3. **No recovery path**: If the camera shows black, there's no retry button or fallback — the user is stuck

## Proposed Changes

### File 1: `src/components/QRScanner.tsx`
- Change overlay background from `bg-black/90` to `bg-black` (fully opaque) so the page behind doesn't bleed through
- Add explicit CSS rules for the video element inside the scanner div to force it to fill the container: `[&_video] { width: 100% !important; height: 100% !important; object-fit: cover; }`
- Increase `minHeight` from 280 to 300 and add `minWidth` to prevent dimension collapse
- Add a "Camera not working?" retry button that appears after 5 seconds if `isStarting` is still false but the user might see black — gives a recovery path (stops scanner, re-creates it)

### What stays the same
- All scan processing logic, QR validation, check-in/check-out flows — zero changes
- StaffScanAttendance page — no changes
- Scanner creation, callbacks, cleanup lifecycle — same logic, just CSS + UX improvements

