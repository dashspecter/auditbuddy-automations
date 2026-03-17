

# Plan: Site Visit Checklist — Collaborative Smart Audit with AI Report

## What we are building

Transform the site visit checklist into a **location audit template** that multiple users can work on simultaneously, with real-time visibility of each other's progress, and an AI-powered report generator that produces a structured output document from all collected data.

## Approach: Build on the existing audit system

The existing audit infrastructure (`audit_templates` → `audit_sections` → `audit_fields` → `audit_field_responses`) already supports all the field types needed (text, textarea, number, photo, checkbox, select, rating). Rather than building something new, we will:

1. **Seed the template** with all 8 sections (A through H) and their ~80 fields
2. **Add real-time collaboration** so multiple users see each other's progress live
3. **Build an AI report generator** that reads all responses and produces the structured outputs

## Implementation — 5 parts

### 1. Seed the Site Visit Template (database insert)

Insert into `audit_templates`, `audit_sections`, and `audit_fields` using the insert tool. The template will be of type `location` and global. Sections map directly to the checklist:

| Section | Fields | Key field types |
|---------|--------|----------------|
| A) Before Arrival | 3 fields | checkbox, textarea |
| B) Rapid Go/No-Go Scan | ~12 fields | text, textarea, checkbox, photo |
| C) Measurements & Space Validation | ~18 fields | number, text, textarea, checkbox, photo |
| D) Storage Deep-Dive | ~12 fields | number, text, textarea, checkbox, select |
| E) Condition & Renovation Scope | ~15 fields | textarea, select, checkbox, photo |
| F) Area Intel & Contacts | ~10 fields | textarea, text |
| G) Documentation Protocol | ~6 fields | photo, textarea |
| H) Required Outputs After Visit | ~8 fields | textarea, select |

Each field will have a descriptive name matching the checklist item (e.g., "Where can a delivery van stop? Any restrictions/times?") and the appropriate field type.

### 2. Real-time collaboration on PerformAudit page

Currently, each user's field responses save to `audit_field_responses` with `created_by`. Multiple users can already work on the same audit — their responses upsert on `(audit_id, field_id)`. What's missing is **live visibility**.

**Changes to `PerformAudit.tsx`:**
- Subscribe to Realtime `postgres_changes` on `audit_field_responses` filtered by `audit_id`
- When another user saves a response, auto-invalidate the query so the UI updates
- Show a small avatar/indicator next to fields that were last edited by someone else
- Add a "collaborators" bar at the top showing who is currently active on the audit

**Database change:**
- Enable realtime on `audit_field_responses`: `ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_field_responses;`
- The existing upsert on `(audit_id, field_id)` means the last writer wins — this is acceptable for a site visit where team members own different sections

**Conflict handling:** Since the checklist assigns sections to specific people (Doug leads C, Alex leads F), in practice users will be editing different fields. The "last write wins" upsert is sufficient. We will show a visual indicator when a field was updated by another user.

### 3. Section ownership / assignment indicators

Add a lightweight "assigned to" indicator per section. This won't be enforced (anyone can edit any field) but provides visual guidance.

**New column on `audit_sections`:** `assigned_label TEXT` (nullable) — stores display text like "Doug lead" or "Tech Ops lead". No schema change needed — we can store this in the section `description` field which already exists. The seeded template will include assignment info in each section description.

### 4. AI Report Generator (edge function + UI)

**New edge function: `supabase/functions/generate-site-visit-report/index.ts`**
- Accepts `audit_id`
- Fetches all sections, fields, and responses from the database
- Sends structured prompt to Lovable AI (google/gemini-3-flash-preview) requesting the 3 required outputs:
  1. "Constraints & Decisions" 1-pager
  2. "Workstreams + Owners" for 2-month timeline
  3. "RFQ Pack" summary for contractor quotes
- Returns the generated report as markdown

**UI changes to `AuditReport.tsx`:**
- Replace the placeholder "AI Insights" tab with a working "Generate Report" button
- Stream the AI response and render it as formatted markdown
- Add a "Copy to Clipboard" and "Export PDF" action for the generated report
- Show section-by-section summary with all photos, measurements, and observations

### 5. Progress tracking dashboard on audit report

Enhance the `AuditReport.tsx` page to show:
- Per-section completion percentage (fields answered / total fields)
- Per-contributor breakdown (who filled what)
- Overall audit completion status
- Visual indicator of which sections still need attention

## File changes summary

| File | Change |
|------|--------|
| **DB insert** | Seed template with ~80 fields across 8 sections |
| **DB migration** | `ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_field_responses;` |
| `src/pages/audits/PerformAudit.tsx` | Add realtime subscription, collaborator bar, field attribution |
| `src/pages/audits/AuditReport.tsx` | Add AI report generation, per-section completion stats, contributor breakdown |
| `supabase/functions/generate-site-visit-report/index.ts` | New edge function for AI report generation |
| `src/hooks/useAuditFieldResponses.ts` | Add realtime subscription hook |
| `src/components/audit/CollaboratorBar.tsx` | New component showing active collaborators |
| `src/components/audit/SiteVisitReport.tsx` | New component for rendering the AI-generated report |

## What does NOT change
- No changes to the template builder — the template is usable and editable via the existing builder
- No changes to staff audits, location audits submission flows, or RLS policies
- No changes to auth, session management, or any existing audit pages
- The template works with the existing PerformAudit flow — no special routing needed

