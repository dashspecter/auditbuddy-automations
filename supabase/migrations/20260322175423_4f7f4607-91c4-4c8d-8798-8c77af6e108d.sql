-- P0: Fix dash_pending_actions status CHECK to include 'executed' and 'failed'
ALTER TABLE public.dash_pending_actions DROP CONSTRAINT IF EXISTS dash_pending_actions_status_check;
ALTER TABLE public.dash_pending_actions ADD CONSTRAINT dash_pending_actions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed', 'failed'));

-- P2: Remove duplicate index on dash_action_log
DROP INDEX IF EXISTS idx_dash_action_log_company;