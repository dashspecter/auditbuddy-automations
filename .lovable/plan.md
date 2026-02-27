

# Inspector Read-Only QR Form View

## Problem
Currently, scanning a QR code requires authentication. External inspectors (not company members) cannot access form data.

## Approach
Create a **new public route** (`/qr/inspect/:token`) and a **backend function** that serves read-only form data using the public token — no login required. The existing authenticated route (`/qr/forms/:token`) remains untouched.

## Changes

### 1. New backend function: `qr-form-public-view`
- Accepts `{ token: string }` — no auth required
- Uses service role to query `location_form_templates` by `public_token` where `is_active = true`
- Fetches the template version schema and the latest `form_submissions` for current month
- Returns: template name, location name, schema, submission data, status — all read-only
- No write access, no mutation endpoints

### 2. New page: `src/pages/qr-forms/QrFormInspectorView.tsx`
- Calls the edge function with the token from URL params
- Renders the form data in a **read-only layout** (grid or log table, matching the existing form display)
- Shows a banner: "Inspector View — Read Only"
- No save/submit buttons, no editable inputs
- All grid cells and log rows displayed as plain text values

### 3. Route registration in `App.tsx`
- Add `/qr/inspect/:token` as a fully public route (no `AuthProvider` wrapper), similar to the kiosk route
- Existing `/qr/forms/:token` route unchanged

### 4. Add "Inspector Link" button to QrFormAssignments cards
- Add a small "Inspector" button/link next to "Open" that copies or opens the `/qr/inspect/:token` URL
- This gives admins easy access to share the read-only link with inspectors

## What stays the same
- All existing RLS policies untouched
- The authenticated `/qr/forms/:token` entry route unchanged
- No database migrations needed

