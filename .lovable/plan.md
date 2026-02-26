

# Fill "Declining Locations" card when no declining trends

When there are no declining locations, replace the empty "✅ No locations..." message with a quick summary of all locations sorted by score (lowest first), showing their current avg score and trend (stable/improving). This fills the card with useful context instead of wasted space.

## Changes

**`src/components/dashboard/DecliningLocationsCard.tsx`**

Replace the empty-state block (lines 53-56) with:
- "All Stable" header with green checkmark
- Show top 3 lowest-scoring locations from `locationPerformance` with their avg score, progress bar, and trend icon (TrendingUp for improving, Minus for stable)
- Each row is clickable (same popup behavior as declining rows)
- Muted/neutral styling instead of red destructive styling

