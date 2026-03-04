

# Template Marketplace — Broken Navigation Fix

## Problem

Two route mismatches cause every template click to 404:

1. **Cards navigate to `/marketplace/template/${slug}`** (line 174 in `MarketplaceBrowse.tsx`)
2. **Route is defined as `/marketplace/:id`** (line 462 in `App.tsx`)
3. **Detail page reads `useParams<{ slug: string }>()` and queries by `slug`** — but the route param is named `:id`

So clicking any template goes to `/marketplace/template/kitchen-deep-clean-checklist` which doesn't match any route → error page.

## Fix (3 small edits)

### 1. Fix the route in `App.tsx` (line 462)

Change:
```
/marketplace/:id → /marketplace/template/:slug
```

This matches what the cards navigate to and what the detail page expects.

### 2. Fix the detail page param extraction in `MarketplaceTemplateDetail.tsx` (line 93)

Change:
```typescript
const { slug } = useParams<{ slug: string }>();
// Currently: useParams reads "slug" but route param was ":id" — now they match
```

Actually this already reads `slug`, so once the route uses `:slug`, it works. No change needed here.

### 3. Verify — no other changes needed

The `useMarketplaceTemplate` hook already queries by `slug` field (line 154 of `useMarketplace.ts`). The data has proper slugs in the database. The only issue is the route path mismatch.

**Total change: 1 line in `App.tsx`** — change `/marketplace/:id` to `/marketplace/template/:slug`.

