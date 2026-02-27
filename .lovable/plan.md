

# Scouts Overview: Step-by-Step Setup Guide UX

Great idea. Right now the Scouts overview shows KPI cards and a generic "Quick Actions" card, which doesn't guide new users through what to do. Replacing the bottom section with a **numbered step-by-step setup flow** will make the onboarding intuitive.

## Design

Replace the "Quick Actions" and "Completion Rate" cards with a **"Getting Started" section** that shows numbered step cards in a horizontal row. Each card includes:
- Step number badge (1, 2, 3, 4, 5)
- Icon, title, short description
- Action button
- Completion indicator (checkmark + green border when done)

The steps will be:

| Step | Title | Description | Route | Done when |
|------|-------|-------------|-------|-----------|
| 1 | Create a Template | Define the checklist scouts will follow | `/scouts/templates` | Templates exist (count > 0) |
| 2 | Add Scouts | Invite field workers to your roster | `/scouts/roster` | Roster has entries |
| 3 | Post a Job | Assign a template to a location | `/scouts/jobs/new` | Jobs exist (count > 0) |
| 4 | Review Submissions | Approve or reject completed work | `/scouts/review` | Has reviewed at least one |
| 5 | Track Payouts | Manage payments for approved jobs | `/scouts/payouts` | Always available |

## Behavior
- Query template count, roster count, and job count to determine completion state
- Once **all steps are completed**, auto-collapse the setup guide into a dismissible banner ("Setup complete!") and show the KPI dashboard + completion rate as the primary view
- Keep KPI cards always visible at the top regardless of setup state

## Changes

### Single file: `src/pages/scouts/ScoutsOverview.tsx`
- Import `useScoutTemplates` to check template count
- Add a simple roster count query (scout roster for company)
- Build a `steps` array with `isDone` computed from data
- Render step cards in a responsive grid (1 col mobile, 3 col md, 5 col lg)
- Each card: numbered badge, icon, title, description, CTA button, green check overlay when done
- Keep existing KPI row at top unchanged
- Replace bottom grid (Completion Rate + Quick Actions) with the step cards when not all steps are done; show the original layout when all are done

