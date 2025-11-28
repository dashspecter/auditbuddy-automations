-- Create table to track user module onboarding progress
CREATE TABLE IF NOT EXISTS public.user_module_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_name TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  steps_completed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_name)
);

-- Enable RLS
ALTER TABLE public.user_module_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can view their own onboarding progress
CREATE POLICY "Users can view their own onboarding"
  ON public.user_module_onboarding
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own onboarding records
CREATE POLICY "Users can create their own onboarding"
  ON public.user_module_onboarding
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own onboarding progress
CREATE POLICY "Users can update their own onboarding"
  ON public.user_module_onboarding
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_user_module_onboarding_updated_at
  BEFORE UPDATE ON public.user_module_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_user_module_onboarding_user_module 
  ON public.user_module_onboarding(user_id, module_name);

CREATE INDEX idx_user_module_onboarding_completed 
  ON public.user_module_onboarding(user_id, completed);