-- Add draft_key column for deduplication
ALTER TABLE public.location_audits 
ADD COLUMN IF NOT EXISTS draft_key text;

-- Create unique partial index to prevent duplicate drafts
CREATE UNIQUE INDEX IF NOT EXISTS idx_location_audits_draft_key_unique 
ON public.location_audits (draft_key) 
WHERE status IN ('draft', 'in_progress');

-- Create function to generate draft key
CREATE OR REPLACE FUNCTION public.generate_audit_draft_key(
  p_company_id uuid,
  p_location_id uuid,
  p_template_id uuid,
  p_user_id uuid,
  p_scheduled_audit_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN encode(
    sha256(
      (COALESCE(p_company_id::text, '') || 
       COALESCE(p_location_id::text, '') || 
       COALESCE(p_template_id::text, '') || 
       COALESCE(p_user_id::text, '') ||
       COALESCE(p_scheduled_audit_id::text, ''))::bytea
    ),
    'hex'
  );
END;
$$;

-- Create function to find or create audit draft (upsert pattern)
CREATE OR REPLACE FUNCTION public.find_or_create_audit_draft(
  p_company_id uuid,
  p_location_id uuid,
  p_template_id uuid,
  p_user_id uuid,
  p_audit_date date,
  p_scheduled_audit_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_draft_key text;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  -- Generate the draft key
  v_draft_key := generate_audit_draft_key(p_company_id, p_location_id, p_template_id, p_user_id, p_scheduled_audit_id);
  
  -- Check for existing draft with this key
  SELECT id INTO v_existing_id
  FROM location_audits
  WHERE draft_key = v_draft_key
    AND status IN ('draft', 'in_progress')
  LIMIT 1;
  
  IF v_existing_id IS NOT NULL THEN
    -- Return existing draft
    RETURN v_existing_id;
  END IF;
  
  -- Create new draft
  INSERT INTO location_audits (
    company_id,
    location_id,
    template_id,
    user_id,
    audit_date,
    status,
    draft_key,
    location
  )
  VALUES (
    p_company_id,
    p_location_id,
    p_template_id,
    p_user_id,
    p_audit_date,
    'draft',
    v_draft_key,
    COALESCE((SELECT name FROM locations WHERE id = p_location_id), 'Unknown')
  )
  RETURNING id INTO v_new_id;
  
  RETURN v_new_id;
END;
$$;

-- Backfill existing drafts with draft_key (one-time cleanup)
UPDATE public.location_audits
SET draft_key = encode(
  sha256(
    (COALESCE(company_id::text, '') || 
     COALESCE(location_id::text, '') || 
     COALESCE(template_id::text, '') || 
     COALESCE(user_id::text, ''))::bytea
  ),
  'hex'
)
WHERE status IN ('draft', 'in_progress')
  AND draft_key IS NULL;

-- Fix audits with NULL completed_at that have status='completed'
UPDATE public.location_audits
SET status = 'draft'
WHERE status = 'completed' AND overall_score IS NULL AND custom_data IS NULL;

-- Mark duplicate drafts as discarded (keep newest, discard others)
WITH ranked_drafts AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, location_id, template_id, user_id 
      ORDER BY updated_at DESC, created_at DESC
    ) as rn
  FROM location_audits
  WHERE status IN ('draft', 'in_progress')
),
duplicates AS (
  SELECT id FROM ranked_drafts WHERE rn > 1
)
UPDATE location_audits
SET status = 'discarded'
WHERE id IN (SELECT id FROM duplicates);