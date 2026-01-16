-- Drop the overly permissive policy that allows anyone to view test questions
DROP POLICY IF EXISTS "Anyone can view questions for active tests" ON public.test_questions;