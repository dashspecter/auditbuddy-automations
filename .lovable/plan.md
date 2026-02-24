

## Fix: Add Loading State to ModuleGate Component

### Change

**File: `src/components/ModuleGate.tsx`**

Add an `isLoading` check before the module access checks. When data is still loading, show a loading spinner instead of immediately rendering the "Module Not Available" lock screen.

```tsx
const { hasModule, canAccessModule, isLoading } = useCompanyContext();

if (isLoading) {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}
```

This is a single, minimal change -- just adding the loading guard before the existing logic. No other files are modified.

