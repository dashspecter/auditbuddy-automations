

# Mystery Shopper Templates — Cross-Company Data Leak

## Root Cause

Two issues combine to leak data across companies:

### 1. Overly permissive RLS policy
The policy `"Public can view active templates by token"` allows SELECT on `mystery_shopper_templates` where `is_active = true` — with **no company_id check**. This was likely intended for the public-facing survey form (accessed via token by unauthenticated users), but it applies to all authenticated users too, so PROPER PIZZA sees templates from every company.

### 2. No company filter in the query
The `useMysteryShopperTemplates` hook fetches `.select("*")` with no `.eq('company_id', ...)` filter, relying entirely on RLS. Since the permissive RLS policy returns all active templates, cross-company data leaks through.

## Fix Plan

### Database migration — tighten the public token policy
- Drop `"Public can view active templates by token"` 
- Recreate it scoped to the `anon` role only (for the public survey form), not `authenticated`:

```sql
DROP POLICY "Public can view active templates by token" ON mystery_shopper_templates;
CREATE POLICY "Anon can view active templates by token"
ON mystery_shopper_templates FOR SELECT TO anon
USING (is_active = true);
```

This way authenticated users only see their own company's templates (via the existing `"Users can view templates in their company"` policy), while unauthenticated public survey access still works.

### No code changes needed
The query doesn't need a `company_id` filter because once the RLS is fixed, authenticated users will only see their own company's templates automatically.

