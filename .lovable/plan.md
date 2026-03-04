

# Mobile UX Audit for Manager Dashboard Experience

## Current State Assessment

After reviewing 20+ pages and components, the platform has a **mixed mobile readiness** profile. Some areas are well-adapted (Audits hub, Workforce hub, Shifts), while others have significant usability problems on mobile.

### What Already Works Well on Mobile

| Area | Status | Notes |
|---|---|---|
| **Bottom Navigation** | Good | 4 main tabs + More sheet, proper 44px touch targets |
| **Audits Hub** (`/audits`) | Good | Grid cards for sub-navigation, responsive filters |
| **Workforce Hub** (`/workforce`) | Good | Grid cards for sub-navigation, responsive layout |
| **Shifts** (`/workforce/shifts`) | Good | Dedicated `MobileShiftDayView` component on mobile |
| **Tasks** (`/tasks`) | Good | Mobile sub-item cards, responsive filters |
| **Command Center** (`/command`) | Good | Purpose-built mobile-first view for owners/admins |
| **Corrective Actions** | Good | Responsive header, card-based list |
| **Pull-to-Refresh** | Good | Implemented on Dashboard, Audits |

---

### Problems Found (Ranked by Impact)

#### 1. Audits Calendar -- Major Problem
**File**: `AuditsCalendar.tsx` (line 799, 809)

The `react-big-calendar` component is fundamentally hostile on mobile:
- Calendar height is `h-[500px]` on mobile with tiny 0.65rem event text
- Month view is unusable: events overlap and text is illegible
- The legend/filter bar (lines 707-743) wraps poorly -- location filter dropdown sits in `ml-auto` forcing a horizontal scroll
- `defaultView` uses `window.innerWidth < 768 ? 'agenda' : 'month'` but only on initial render; switching views doesn't adapt
- The toggle between calendar/list mode only appears when `hasOverlappingEvents && isMobile` -- should always be available on mobile
- `container mx-auto px-4 py-8` padding is too generous for mobile (wastes 32px horizontal)

**Fix**: On mobile, default to **Agenda view always** (it's the only readable view as shown in the user's screenshot). Show a simpler toolbar with view toggle always visible. Reduce padding. Stack legend items vertically. Make location filter full-width.

#### 2. Employee Management Table -- Major Problem
**File**: `EmployeeManagement.tsx` (line 182-260)

Uses a raw `<Table>` with 5 columns (Name, Location, Role, Status, Actions) -- no mobile adaptation whatsoever. On a 375px screen:
- Columns get squished, text truncates aggressively
- Action buttons (Edit, Delete, Reset Password, Contract) overflow
- Header buttons ("Upload Template" + "Add Employee") don't stack

**Fix**: On mobile, switch to card-based layout using `MobileCardList`/`MobileCard` components that already exist in the codebase (`responsive-table.tsx`). Show key info (name, role, location) with expandable actions.

#### 3. Locations Management Table -- Major Problem
**File**: `LocationsManagement.tsx` (line 143-191)

Same issue as Employee Management: raw `<Table>` with 6 columns (Name, City, Type, Address, Status, Actions). Address column gets `max-w-[200px] truncate` but the table still overflows on mobile.

**Fix**: Card-based layout on mobile with location name prominent, address as subtitle, status badge inline.

#### 4. Reports Page -- Major Problem
**File**: `Reports.tsx` (873 lines)

This is a dense analytics page with:
- Multiple filter dropdowns (Date From, Date To, Location, Template, User) that don't stack on mobile
- Recharts charts that may not resize properly
- Data tables for audit details
- No `useIsMobile` usage at all -- zero mobile adaptation

**Fix**: Stack all filters vertically on mobile. Ensure charts use `ResponsiveContainer`. Use card layout for audit data tables.

#### 5. Tasks Page -- Moderate Problem
**File**: `Tasks.tsx` (lines 640-692, 706-729)

The filter bar has three `w-[200px]` fixed-width Select dropdowns side-by-side. On mobile they overflow horizontally. The `TabsList` with 8 tabs (List, Ops Dashboard, Today, Tomorrow, Pending, Overdue, Completed, By Employee) overflows and relies on `flex-wrap h-auto` which creates a messy multi-row tab bar.

**Fix**: Stack filters vertically on mobile. Consider a horizontal scrollable tab bar or collapsible filter panel.

#### 6. Notifications Page -- Moderate Problem
**File**: `Notifications.tsx` (802 lines)

Complex form with rich text editor, multiple selects, checkbox groups. No `useIsMobile` usage detected. The rich text editor toolbar likely overflows on mobile.

**Fix**: Stack form fields, simplify toolbar on mobile.

#### 7. Manager Dashboard Header -- Minor Problem
**File**: `ManagerDashboard.tsx` (lines 44-68)

The header has title + refresh button + badge + `DateRangeFilter` all in one row. On mobile the date range filter likely pushes content off-screen.

**Fix**: Stack header elements vertically on mobile.

#### 8. Evidence Review -- Minor Problem
**File**: `EvidenceReview.tsx`

Filter bar with search + select dropdowns, but uses `StickyActionBar` which is already mobile-aware. Main concern is the evidence viewer dialogs on mobile.

---

## Proposed Implementation Plan (Phased)

### Phase 1: Critical Calendar Fix
- **AuditsCalendar.tsx**: Force agenda view on mobile. Always show calendar/list toggle. Reduce container padding. Stack legend and filters vertically. Make location filter full-width.
- **TasksCalendar.tsx**: Same agenda-first approach on mobile.
- **calendar.css**: Improve mobile toolbar button sizing, add touch-friendly toolbar gaps.

### Phase 2: Table-to-Card Conversions
- **EmployeeManagement.tsx**: Use `useIsMobile` to render `MobileCardList` instead of `<Table>` on mobile. Each card shows name, role, location, status with swipeable or dropdown actions.
- **LocationsManagement.tsx**: Same pattern -- card layout on mobile with location name, city, status.

### Phase 3: Filter & Tab Responsiveness
- **Tasks.tsx**: Stack filter selects vertically on mobile (`flex-col` below `sm`). Make tab bar horizontally scrollable with `overflow-x-auto` instead of wrapping.
- **Reports.tsx**: Stack all filter controls vertically on mobile. Wrap chart containers with proper responsive sizing.
- **ManagerDashboard.tsx**: Stack header controls vertically on mobile.

### Phase 4: Form & Detail View Polish
- **Notifications.tsx**: Stack form layout on mobile, ensure rich text editor is usable.
- **EvidenceReview.tsx**: Ensure evidence viewer and filter bar work on mobile.

---

## Technical Approach

All changes follow existing patterns:
- Use `useIsMobile()` hook (already in the codebase)
- Use existing `MobileCard`, `MobileCardList`, `MobileCardRow`, `MobileCardHeader` components from `responsive-table.tsx`
- Use Tailwind responsive prefixes (`sm:`, `md:`) for layout changes
- No new dependencies needed
- No database changes
- No breaking changes to desktop views

## Estimated Scope

- **Phase 1**: 3 files, focused CSS and layout changes
- **Phase 2**: 2 files, conditional rendering with existing components
- **Phase 3**: 3 files, Tailwind class adjustments
- **Phase 4**: 2 files, layout adjustments

Total: ~10 files modified, zero new files, zero breaking changes.

