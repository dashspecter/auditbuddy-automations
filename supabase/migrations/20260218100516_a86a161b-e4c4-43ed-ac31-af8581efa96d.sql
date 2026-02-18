-- Add unique constraint on evidence_policies so upsert(onConflict) works correctly
ALTER TABLE public.evidence_policies
  ADD CONSTRAINT evidence_policies_company_applies_unique
    UNIQUE (company_id, applies_to, applies_id);