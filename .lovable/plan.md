

# Add Importance Weight to Scout Template Steps

## Database Migration
Add `weight` column (integer, 1-5, default 1) to `scout_template_steps` table.

```sql
ALTER TABLE public.scout_template_steps
ADD COLUMN weight integer NOT NULL DEFAULT 1;
```

## Code Changes

### `src/hooks/useScoutTemplates.ts`
- Add `weight: number` to `ScoutTemplateStep` interface
- Include `weight` in create/update step insert payloads

### `src/pages/scouts/ScoutsTemplates.tsx`
- Add `weight: 1` default to `addStep()`
- Add a small select/input (1-5) in the step card grid row for setting weight
- Show weight in the view dialog (e.g. "Weight: 3/5" or star-like indicator)
- Include weight in the edit mode step mapping

