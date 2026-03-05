

# Fix: Breadcrumb "Admin" Link Goes to 404

## Problem
On the Company Detail page (`/admin/companies/:id`), the breadcrumb shows `Home > Admin > Companies`. Clicking "Admin" navigates to `/admin`, which has no route — causing a 404. The correct destination is `/admin/platform`.

## Fix
Add a route redirect map to `Breadcrumbs.tsx` that overrides the auto-generated path for segments that don't have their own route.

**File**: `src/components/layout/Breadcrumbs.tsx`

Add a mapping for path overrides:
```ts
const pathOverrideMap: Record<string, string> = {
  "/admin": "/admin/platform",
};
```

Then in the breadcrumb item generation, apply the override when building the `path`:
```ts
const rawPath = `/${pathSegments.slice(0, originalIndex + 1).join("/")}`;
const path = pathOverrideMap[rawPath] || rawPath;
```

Also add `"companies"` and `"platform"` to `routeNameMap`:
```ts
companies: "Companies",
platform: "Platform Admin",
```

Single file change, no database or routing changes needed.

