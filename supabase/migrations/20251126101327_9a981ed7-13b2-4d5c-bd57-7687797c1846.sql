-- Drop the existing check constraint on location_audits status
ALTER TABLE location_audits DROP CONSTRAINT IF EXISTS location_audits_status_check;

-- Add the updated check constraint that includes all valid statuses
ALTER TABLE location_audits ADD CONSTRAINT location_audits_status_check 
  CHECK (status IS NULL OR status IN ('draft', 'scheduled', 'in_progress', 'completed', 'cancelled', 'compliant', 'non-compliant'));