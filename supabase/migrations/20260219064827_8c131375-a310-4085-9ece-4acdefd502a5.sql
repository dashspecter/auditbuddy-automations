
CREATE TABLE public.demo_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT NOT NULL,
  locations TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (unauthenticated) to insert a demo request
CREATE POLICY "Anyone can submit a demo request"
  ON public.demo_requests
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated platform admins can view demo requests
CREATE POLICY "Admins can view demo requests"
  ON public.demo_requests
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
