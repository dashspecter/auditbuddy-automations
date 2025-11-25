-- Create document categories table
CREATE TABLE public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.document_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  passing_score INTEGER NOT NULL DEFAULT 70,
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test questions table
CREATE TABLE public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_answer TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create test submissions table
CREATE TABLE public.test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  staff_location TEXT NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  time_taken_minutes INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

-- Document Categories RLS Policies
CREATE POLICY "Admins and managers can manage categories"
ON public.document_categories
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "All authenticated users can view categories"
ON public.document_categories
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Documents RLS Policies
CREATE POLICY "Admins and managers can manage documents"
ON public.documents
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "All authenticated users can view documents"
ON public.documents
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Tests RLS Policies
CREATE POLICY "Admins and managers can manage tests"
ON public.tests
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authenticated users can view active tests"
ON public.tests
FOR SELECT
USING (is_active = true);

-- Test Questions RLS Policies
CREATE POLICY "Admins and managers can manage questions"
ON public.test_questions
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Anyone can view questions for active tests"
ON public.test_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tests
    WHERE tests.id = test_questions.test_id
    AND tests.is_active = true
  )
);

-- Test Submissions RLS Policies
CREATE POLICY "Anyone can create test submissions"
ON public.test_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins and managers can view all submissions"
ON public.test_submissions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role)
);

-- Create updated_at triggers
CREATE TRIGGER handle_document_categories_updated_at
BEFORE UPDATE ON public.document_categories
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tests_updated_at
BEFORE UPDATE ON public.tests
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create indexes
CREATE INDEX idx_documents_category_id ON public.documents(category_id);
CREATE INDEX idx_tests_document_id ON public.tests(document_id);
CREATE INDEX idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX idx_test_submissions_test_id ON public.test_submissions(test_id);
CREATE INDEX idx_tests_scheduled_for ON public.tests(scheduled_for);

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
);

-- Storage RLS policies for documents
CREATE POLICY "Admins and managers can upload documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

CREATE POLICY "Admins and managers can view documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents' AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  )
);

CREATE POLICY "Admins and managers can delete documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'documents' AND
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'manager'))
  )
);