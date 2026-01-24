
-- Create a function to get the cron secret from vault (we'll store it there)
-- First, let's create a simple approach: store the secret in a secure table
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow only service role
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

-- No policies = only service role can access
