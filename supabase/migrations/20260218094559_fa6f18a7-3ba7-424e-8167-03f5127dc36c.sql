
-- =====================================================
-- EvidenceOS Phase 1: Database Foundation
-- =====================================================

-- 1. evidence_packets: Core proof object attached to any subject
CREATE TABLE public.evidence_packets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  location_id uuid NOT NULL,
  subject_type text NOT NULL, -- 'task_occurrence' | 'audit_item' | 'work_order' | 'incident' | 'training_signoff'
  subject_id uuid NOT NULL,
  subject_item_id uuid,
  status text NOT NULL DEFAULT 'submitted', -- draft | submitted | approved | rejected
  version int NOT NULL DEFAULT 1,
  created_by uuid NOT NULL,
  submitted_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_reason text,
  notes text,
  tags text[],
  client_captured_at timestamptz,
  device_info jsonb,
  redacted_at timestamptz,
  redacted_by uuid,
  redaction_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. evidence_media: Files per packet (versioned, immutable paths)
CREATE TABLE public.evidence_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL, -- photo | video | file
  mime_type text,
  size_bytes bigint,
  sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. evidence_events: Append-only tamper-evident audit log
CREATE TABLE public.evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  packet_id uuid NOT NULL REFERENCES public.evidence_packets(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  event_type text NOT NULL, -- created | submitted | approved | rejected | redacted | versioned
  from_status text,
  to_status text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. evidence_policies: Per-template configuration
CREATE TABLE public.evidence_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  location_id uuid, -- null = company-wide default
  applies_to text NOT NULL, -- 'task_template' | 'audit_template' | 'work_order_type' | 'training_module'
  applies_id uuid NOT NULL,
  evidence_required boolean NOT NULL DEFAULT false,
  review_required boolean NOT NULL DEFAULT false,
  required_media_types text[], -- e.g. ['photo']
  min_media_count int NOT NULL DEFAULT 1,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX idx_evidence_packets_company_location ON public.evidence_packets(company_id, location_id, created_at DESC);
CREATE INDEX idx_evidence_packets_subject ON public.evidence_packets(subject_type, subject_id);
CREATE INDEX idx_evidence_packets_status ON public.evidence_packets(status);
CREATE INDEX idx_evidence_media_packet ON public.evidence_media(packet_id);
CREATE INDEX idx_evidence_events_packet ON public.evidence_events(packet_id, created_at);
CREATE INDEX idx_evidence_policies_applies ON public.evidence_policies(company_id, applies_to, applies_id);

-- =====================================================
-- Row Level Security
-- =====================================================
ALTER TABLE public.evidence_packets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_policies ENABLE ROW LEVEL SECURITY;

-- evidence_packets RLS
CREATE POLICY "evidence_packets_select_company"
  ON public.evidence_packets FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evidence_packets_insert_own"
  ON public.evidence_packets FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evidence_packets_update_reviewers"
  ON public.evidence_packets FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );

-- evidence_media RLS
CREATE POLICY "evidence_media_select_company"
  ON public.evidence_media FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evidence_media_insert_own"
  ON public.evidence_media FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- evidence_events RLS (INSERT only — tamper-evident, no UPDATE/DELETE policies)
CREATE POLICY "evidence_events_select_company"
  ON public.evidence_events FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evidence_events_insert_only"
  ON public.evidence_events FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = actor_id
    AND company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- evidence_policies RLS
CREATE POLICY "evidence_policies_select_company"
  ON public.evidence_policies FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
      UNION
      SELECT company_id FROM public.employees WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "evidence_policies_insert_managers"
  ON public.evidence_policies FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );

CREATE POLICY "evidence_policies_update_managers"
  ON public.evidence_policies FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT cu.company_id FROM public.company_users cu
      WHERE cu.user_id = auth.uid()
        AND cu.company_role IN ('company_owner', 'company_admin', 'company_manager')
    )
  );

-- =====================================================
-- Storage bucket: evidence (private)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated read within own company path
CREATE POLICY "evidence_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.company_id::text FROM public.company_users cu WHERE cu.user_id = auth.uid()
      UNION
      SELECT e.company_id::text FROM public.employees e WHERE e.user_id = auth.uid()
    )
  );

-- Storage RLS: authenticated upload within own company path
CREATE POLICY "evidence_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] IN (
      SELECT cu.company_id::text FROM public.company_users cu WHERE cu.user_id = auth.uid()
      UNION
      SELECT e.company_id::text FROM public.employees e WHERE e.user_id = auth.uid()
    )
  );
