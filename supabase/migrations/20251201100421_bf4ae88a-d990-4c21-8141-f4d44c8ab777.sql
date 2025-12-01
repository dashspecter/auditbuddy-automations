-- Add creator_name column to shifts table to store the name at creation time
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- Update existing shifts with creator names from auth metadata
UPDATE shifts s
SET creator_name = (
  SELECT raw_user_meta_data->>'full_name'
  FROM auth.users
  WHERE id = s.created_by
)
WHERE creator_name IS NULL;