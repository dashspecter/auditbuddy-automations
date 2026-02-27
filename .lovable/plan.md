

# Align Step Card Buttons

The buttons are misaligned because card descriptions have different heights. Fix by making each card a flex column with the button pushed to the bottom.

## Change: `src/pages/scouts/ScoutsOverview.tsx`

- Add `flex flex-col h-full` to each step `<Card>`
- Add `flex-1` to the `<CardContent>` wrapper so descriptions expand
- Use `mt-auto` on the button so it always sits at the bottom
- This ensures all 5 CTA buttons align on the same horizontal line regardless of text length

