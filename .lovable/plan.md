

## Add Location Filter to All Task Tabs

### Problem

Currently, **only the Ops Dashboard tab** has a location filter. The Today, Tomorrow, Pending, Overdue, and Completed tabs show tasks from **all locations mixed together**, making it hard to understand what's happening at a specific location. When you manage multiple locations, this is confusing and inefficient.

### Solution

Add a **persistent location filter bar** that sits between the stat cards and the tab content. It applies to **all tabs** (Today, Tomorrow, Pending, Overdue, Completed, By Employee) so you can instantly scope everything to one location — or see all locations at once.

### Visual Layout

```text
[Stats Cards Row]

[Location: All Locations v]     <-- NEW persistent filter

[List | Ops Dashboard | Today 11 | Tomorrow 11 | Pending | Overdue | Completed | By Employee]

[Filtered task content...]
```

### What Changes

1. **Location filter dropdown** added above the tabs, using the same `Select` component and location data already used in the Ops Dashboard tab. Defaults to "All Locations".

2. **Filter applied to all relevant tabs**:
   - **Today / Tomorrow**: Filter the unified pipeline results by `task.location_id`
   - **Pending / Overdue / Completed**: Filter the base task list by `task.location_id`
   - **By Employee**: Pass `locationId` to the timeline component
   - **List tab**: Also filtered (shows task templates for that location)
   - **Ops Dashboard**: Already has its own filter -- the global one will sync or defer to it

3. **Stat cards update** to reflect the selected location (filtered counts instead of global counts)

4. **Tasks grouped by location** within each tab when "All Locations" is selected -- add a small location header/divider between groups so tasks are visually organized even without filtering

### Technical Details

**File**: `src/pages/Tasks.tsx`

1. Add state: `const [selectedLocationId, setSelectedLocationId] = useState<string>("all")`

2. Fetch locations using the existing `useLocations` hook (already used elsewhere in the app)

3. Add a `Select` dropdown between the stat cards and the `Tabs` component

4. Update `filteredTasks` memo to apply `selectedLocationId` filter:
   ```
   if (selectedLocationId !== "all") {
     result = result.filter(t => t.location_id === selectedLocationId);
   }
   ```

5. Update `todayTasks` / `tomorrowTasks` filtering similarly — filter the unified pipeline output

6. When "All Locations" is selected, group tasks within Today/Tomorrow/Pending tabs by location using small section headers (location name as a divider), so even the unfiltered view is organized rather than a flat list

7. Update stat card values to respect the location filter (compute filtered counts)

### Summary

| Change | Detail | Risk |
|--------|--------|------|
| Location filter dropdown | New Select component above tabs | None (additive) |
| Filter logic in filteredTasks | One additional `.filter()` call | None |
| Filter logic in today/tomorrow | Filter unified pipeline output | None |
| Location grouping in flat lists | Small section headers by location | None (visual only) |
| Stat cards filtered | Recompute counts with location filter | None |

One file changed (`Tasks.tsx`), plus importing `useLocations`. No database changes. No backend changes. Fully backwards compatible — defaults to "All Locations" which shows the same data as today.

