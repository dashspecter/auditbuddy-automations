
-- Add missing columns to dash_pending_actions
ALTER TABLE public.dash_pending_actions 
  ADD COLUMN IF NOT EXISTS action_type text NOT NULL DEFAULT 'write',
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS execution_result jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS idx_dash_pending_actions_company ON public.dash_pending_actions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_dash_pending_actions_user ON public.dash_pending_actions(user_id, status);
