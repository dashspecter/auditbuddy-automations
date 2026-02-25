

## Analysis

The database confirms that the majority of recent waste entries have `photo_path: NULL`. Out of the 20 most recent entries, only 5 have photos stored. The rest were submitted without photos.

This is not a display bug — the photos were never uploaded in the first place. The current flow creates the entry first, then uploads the photo and updates the `photo_path` in a second step. If the upload fails silently (common on Android where the browser kills the page when the camera opens) or the user simply didn't attach a photo, the entry is saved without a `photo_path`.

The faded gray icons in the screenshot correctly represent entries with no photo. The two entries at the bottom with actual thumbnails are the ones that have `photo_path` values in the database.

## Root Cause

Photos are optional. The code explicitly allows this (line 89-97 in `AddWasteEntry.tsx`):
```
// Photo is optional — Android may kill the page when camera opens
```

Since you just made reasons mandatory, you likely also want photos to be mandatory so every waste entry has visual evidence.

## Proposed Fix

**File: `src/pages/staff/AddWasteEntry.tsx`**

Make the photo required before submission:
1. Add `photoFile` to the validation check — disable "Record Waste" button unless a photo is attached
2. Remove the "no photo attached" toast fallback
3. Show a validation message if the user tries to submit without a photo

**File: `src/pages/admin/waste/AdminAddWasteEntry.tsx`**

Same changes for the admin entry form.

These are the only two files that change. No backend changes, no new tables, no changes to hooks or other components.

### For existing entries without photos

The entries already in the database without photos cannot retroactively gain photos. The "My Entries" and "Admin Entries" pages already have an "Upload Photo" button for adding photos to existing entries after the fact. No change needed there.

