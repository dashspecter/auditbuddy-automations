
## Fix: Double Sidebar on Staff Profile Page

### Problem
When you click "View" on a staff member, you see two sidebars and two top bars stacked. This happens because:

1. The route wrapper (`ManagerRoute`) already adds the full page layout (sidebar, top bar, breadcrumbs)
2. The Staff Profile page **also** adds the same layout around its content

This means the layout gets applied twice, creating the "double menu" you see.

### Solution
Remove the extra layout wrapper from the Staff Profile page (`src/pages/workforce/StaffProfile.tsx`). Instead of wrapping content in `AppLayout`, the page should just return its content directly — since the route wrapper already provides the layout.

### What Changes
- **File**: `src/pages/workforce/StaffProfile.tsx`
  - Remove the `AppLayout` import
  - Remove the `<AppLayout>` wrapper from both the "not found" state and the main return
  - Replace with a plain fragment or div

### Technical Detail
- Line ~27: Change the "not found" return from `<AppLayout><div>...</div></AppLayout>` to just `<div>...</div>`
- Line ~37: Change the main return from `<AppLayout><div className="space-y-6">...</div></AppLayout>` to just `<div className="space-y-6">...</div>`

This is a small, safe change — it just removes the duplicate wrapper.
