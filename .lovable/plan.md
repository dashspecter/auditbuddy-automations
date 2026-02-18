
# EvidenceOS — Phase 1 + Phase 2 Implementation Plan

## What We're Building

A clean, additive "EvidenceOS" layer that introduces a universal proof system. Phase 1 creates the database foundation. Phase 2 builds the capture UI and wires it into the Task completion flow — the highest-value integration point. Nothing existing is broken or removed.

---

## What Already Exists (We Reuse)

- `task_completions` table — already has `completion_photo_url` (we extend, not replace)
- `tasks` table — already has `early_requires_photo` and `completion_photo_url` flags
- `AuditPhotoCapture.tsx` / `CameraCapture.tsx` — photo capture pattern we follow
- `compressImage()` in `src/lib/imageCompression.ts` — reuse for photo compression
- `photos` storage bucket does NOT exist (not listed) — we create `evidence` bucket
- `pdfBranding.ts` — reused in Phase 4 (Dossier)
- `useStaffTodayTasks` hook + `completeTaskRow` in `StaffTasks.tsx` — integration point

---

## Phase 1: Database Foundation

### 4 New Tables

**`evidence_packets`** — Core object attached to any subject
```
id uuid PK default gen_random_uuid()
company_id uuid NOT NULL
location_id uuid NOT NULL
subject_type text NOT NULL  -- 'task_occurrence' | 'audit_item' | 'work_order' | 'incident' | 'training_signoff'
subject_id uuid NOT NULL    -- e.g. task_completions.id or tasks.id
subject_item_id uuid        -- optional sub-item
status text NOT NULL default 'submitted'  -- draft | submitted | approved | rejected
version int NOT NULL default 1
created_by uuid NOT NULL
submitted_at timestamptz
reviewed_by uuid
reviewed_at timestamptz
review_reason text
notes text
tags text[]
client_captured_at timestamptz
device_info jsonb
redacted_at timestamptz
redacted_by uuid
redaction_reason text
created_at timestamptz default now()
```

**`evidence_media`** — Files per packet (versioned, immutable paths)
```
id uuid PK default gen_random_uuid()
company_id uuid NOT NULL
packet_id uuid NOT NULL REFERENCES evidence_packets(id) ON DELETE CASCADE
storage_path text NOT NULL   -- immutable path, never overwritten
media_type text NOT NULL     -- photo | video | file
mime_type text
size_bytes bigint
sha256 text
created_at timestamptz default now()
```

**`evidence_events`** — Append-only tamper-evident log (INSERT only, no UPDATE/DELETE via RLS)
```
id uuid PK default gen_random_uuid()
company_id uuid NOT NULL
packet_id uuid NOT NULL REFERENCES evidence_packets(id)
actor_id uuid NOT NULL
event_type text NOT NULL   -- created | submitted | approved | rejected | redacted | versioned
from_status text
to_status text
payload jsonb
created_at timestamptz default now()
```

**`evidence_policies`** — Per-template configuration (is evidence required?)
```
id uuid PK default gen_random_uuid()
company_id uuid NOT NULL
location_id uuid            -- null = company-wide default
applies_to text NOT NULL    -- 'task_template' | 'audit_template' | 'work_order_type' | 'training_module'
applies_id uuid NOT NULL    -- the template/task id
evidence_required boolean NOT NULL default false
review_required boolean NOT NULL default false
required_media_types text[] -- ['photo']
min_media_count int NOT NULL default 1
instructions text
created_at timestamptz default now()
```

### Storage Bucket: `evidence`
- Public: false (authenticated access only)
- Path convention: `{company_id}/{subject_type}/{subject_id}/packet/{packet_id}/v{version}/{media_id}.jpg`
- Policies: authenticated users can upload to their own company's paths; read access for same company

### RLS Policies

All tables use `company_id` scoping consistent with the rest of the platform:

- **evidence_packets**: SELECT (same company), INSERT (authenticated, own company_id), UPDATE (reviewer roles only for status changes), DELETE disabled
- **evidence_media**: SELECT (same company), INSERT (authenticated, own company_id), DELETE disabled
- **evidence_events**: SELECT (same company), INSERT only (no UPDATE, no DELETE — enforced via policy absence)
- **evidence_policies**: SELECT (same company), INSERT/UPDATE (manager/admin roles only)

Reuses existing `has_role()` and company membership checks matching the platform pattern.

---

## Phase 2: Capture UI + Task Integration

### New Files Created

**`src/hooks/useEvidencePackets.ts`**
- `useEvidencePackets(subjectType, subjectId)` — fetches packets + media for a subject
- `useCreateEvidencePacket()` — mutation: upload media → create packet → log event
- `useReviewEvidencePacket()` — mutation: approve/reject → log event
- `useEvidencePolicy(appliesTo, appliesId)` — fetches policy for a task template

**`src/components/evidence/EvidenceCaptureModal.tsx`**
Reusable modal with:
- Instructions panel (from policy)
- Camera capture (reuses `compressImage` from `imageCompression.ts`)
- File upload fallback (browser `<input type="file">`)
- Notes text input
- Media count validation
- Upload to `evidence` bucket → create `evidence_media` → create `evidence_packet`
- Append `evidence_events` row on submit
- Props: `subjectType`, `subjectId`, `policy`, `onComplete(packetId)`, `onCancel`

**`src/components/evidence/EvidencePacketViewer.tsx`**
Read-only + review component:
- Media gallery (thumbnails, full-screen lightbox)
- Status badge + version indicator ("v1", "v2")
- Approve / Reject buttons (manager roles only — checked via `useUserRole`)
- Rejection reason input
- Timeline of `evidence_events` (who did what, when)
- Redaction (admin only, with required reason)

**`src/components/evidence/EvidenceStatusBadge.tsx`**
Tiny reusable badge: `No proof` / `Proof pending review` / `Proof approved` / `Proof rejected`

### Task Integration (Additive Only)

Integration point is in `src/pages/staff/StaffTasks.tsx` inside `completeTaskRow`.

**Flow:**
1. Staff taps task completion checkbox
2. Before calling `completeTask.mutateAsync()`, check if an `evidence_policy` exists for this task
3. If `evidence_required = true` → open `EvidenceCaptureModal` first
4. Staff captures photo + optional notes → packet created with status `submitted`
5. `completeTask.mutateAsync()` is then called normally (no change to `complete_task_guarded` DB function)
6. Task completion record gets the `evidence_packet_id` stored in `completion_photo_url` (or we add `evidence_packet_id` column to `task_completions`)
7. If `review_required = true` → task shows "Completed (Pending Review)" badge; otherwise normal "Completed"

**Evidence indicator on task card:**
- Small camera icon badge on `MobileTaskCard` when a packet exists for that task occurrence
- Clicking it opens `EvidencePacketViewer` (slide-up sheet)

**Task Edit page (`src/pages/TaskEdit.tsx` / `src/pages/TaskNew.tsx`):**
- Add "Evidence Policy" section at bottom
- Toggle: "Require proof photo"
- If on: "Also require review" toggle + "Instructions for staff" text field
- This creates/updates an `evidence_policies` row for that task

---

## File Change Summary

### New Files (no existing file touched except integration points)
```
src/hooks/useEvidencePackets.ts
src/components/evidence/EvidenceCaptureModal.tsx
src/components/evidence/EvidencePacketViewer.tsx
src/components/evidence/EvidenceStatusBadge.tsx
```

### Modified Files (additive changes only)
```
src/pages/staff/StaffTasks.tsx
  → Add evidence gate in completeTaskRow (before mutateAsync)
  → Add EvidenceStatusBadge on completed task cards

src/pages/TaskNew.tsx / src/pages/TaskEdit.tsx
  → Add "Evidence Policy" card at bottom (toggle + instructions)
```

### Database Migration
```
1. CREATE TABLE evidence_packets (...)
2. CREATE TABLE evidence_media (...)
3. CREATE TABLE evidence_events (...)
4. CREATE TABLE evidence_policies (...)
5. CREATE INDEX on evidence_packets(company_id, location_id, created_at)
6. CREATE INDEX on evidence_packets(subject_type, subject_id)
7. CREATE INDEX on evidence_media(packet_id)
8. CREATE INDEX on evidence_events(packet_id, created_at)
9. RLS policies for all 4 tables
10. INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false)
11. Storage RLS policies
```

---

## What We Are NOT Doing in This Phase

- No changes to `complete_task_guarded` DB function (sacrosanct)
- No changes to `useStaffTodayTasks` hook internals
- No Compliance Dossier yet (Phase 4)
- No audit or work order integration yet (Phase 3)
- No kiosk evidence capture

---

## Implementation Order

1. Run migration (4 tables + storage bucket + RLS)
2. Create `useEvidencePackets.ts` hook
3. Create `EvidenceCaptureModal.tsx` component
4. Create `EvidencePacketViewer.tsx` component
5. Create `EvidenceStatusBadge.tsx` component
6. Add evidence policy section to `TaskNew.tsx` + `TaskEdit.tsx`
7. Add evidence gate in `StaffTasks.tsx` completeTaskRow
8. Add evidence badges on completed task cards in `StaffTasks.tsx`
