-- Add scheduled_start and scheduled_end columns to location_audits table
ALTER TABLE location_audits 
ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assigned_user_id UUID REFERENCES profiles(id);

-- Add index for faster calendar queries
CREATE INDEX IF NOT EXISTS idx_location_audits_scheduled_start 
ON location_audits(scheduled_start) 
WHERE scheduled_start IS NOT NULL;

-- Add index for assigned user queries
CREATE INDEX IF NOT EXISTS idx_location_audits_assigned_user 
ON location_audits(assigned_user_id) 
WHERE assigned_user_id IS NOT NULL;