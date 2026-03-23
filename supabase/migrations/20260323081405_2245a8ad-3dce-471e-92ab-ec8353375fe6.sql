
-- Fix broken shifts: update wrong dates to today (2026-03-23)
UPDATE shifts SET shift_date = '2026-03-23', updated_at = now() 
WHERE id = '3de979a0-b6d7-4f19-8697-de716c704440' AND shift_date = '2024-07-30';

-- Delete the stale draft shift
DELETE FROM shifts WHERE id = '977bbc0e-5791-44aa-b48c-a6730a1fff95' AND shift_date = '2024-07-30' AND status = 'draft';

-- Expire stale pending actions
UPDATE dash_pending_actions SET status = 'expired', updated_at = now() 
WHERE id IN ('161052b9-9cb8-4aa6-86da-10261797a87d', 'bf6cb6a2-8016-47f1-a106-ca247c376fce') AND status = 'pending';

-- Archive poisoned sessions
UPDATE dash_sessions SET status = 'archived', updated_at = now() 
WHERE id IN ('e9b114b3-35fd-464e-8f85-c01ec2d3f4da', '61c84672-00f1-4d37-b00c-6f8d59a4d237', '3b3b919e-b702-4182-a82a-8572d57f1e11') AND status = 'active';
