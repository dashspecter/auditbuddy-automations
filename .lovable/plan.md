
## Default to Location View with Auto-Selected Location

### Problem
The schedule grid defaults to "Employees" view mode and "All Locations", requiring the manager to manually switch to "Locations" view and pick a location every time they open the page.

### Fix

**File: `src/components/workforce/EnhancedShiftWeekView.tsx`**

1. **Change default `viewMode`** from `"employee"` to `"location"` (line 71)
   ```
   // Before
   const [viewMode, setViewMode] = useState<"employee" | "location">("employee");
   // After
   const [viewMode, setViewMode] = useState<"employee" | "location">("location");
   ```

2. **Improve auto-select location logic** (lines 150-164) to pick the first location that has a schedule (shifts or a `schedule_periods` entry), falling back to the first location if none have shifts yet. This ensures a location is always pre-selected instead of showing "All Locations":

   ```
   useEffect(() => {
     if (hasAutoSelectedLocation || locations.length === 0) return;
     
     // If shifts loaded, prefer a location with shifts
     if (!isLoading) {
       const locationIdsWithShifts = [...new Set(shifts.map(s => s.location_id))];
       const locationWithShifts = locations.find(l => locationIdsWithShifts.includes(l.id));
       
       if (locationWithShifts) {
         setSelectedLocation(locationWithShifts.id);
       } else {
         // No shifts anywhere — just pick the first location
         setSelectedLocation(locations[0].id);
       }
       setHasAutoSelectedLocation(true);
     }
   }, [hasAutoSelectedLocation, isLoading, shifts, locations]);
   ```

### Result
- Opening the Shifts page will immediately show the **Location view** with a **specific location selected** (the first one that has shifts, or simply the first location)
- Managers no longer need to click "Locations" and pick a location each time
