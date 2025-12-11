-- Mystery Shopper Audit Templates
CREATE TABLE public.mystery_shopper_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_location_ids UUID[] DEFAULT '{}',
  voucher_value NUMERIC NOT NULL DEFAULT 25,
  voucher_currency TEXT NOT NULL DEFAULT 'RON',
  voucher_expiry_days INTEGER NOT NULL DEFAULT 30,
  voucher_terms_text TEXT DEFAULT 'Valid for one use only. Cannot be combined with other offers.',
  brand_logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  require_contact BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mystery Shopper Questions
CREATE TABLE public.mystery_shopper_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.mystery_shopper_templates(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'rating', 'text')),
  options JSONB DEFAULT '[]',
  rating_scale JSONB DEFAULT '{"min": 1, "max": 5}',
  is_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mystery Shopper Submissions (public submissions - no user_id required)
CREATE TABLE public.mystery_shopper_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.mystery_shopper_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  overall_score NUMERIC,
  raw_answers JSONB NOT NULL DEFAULT '{}',
  voucher_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vouchers table
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_ids UUID[] DEFAULT '{}',
  customer_name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE DEFAULT upper(encode(gen_random_bytes(6), 'hex')),
  value NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RON',
  brand_logo_url TEXT,
  terms_text TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired')),
  redeemed_at TIMESTAMP WITH TIME ZONE,
  linked_submission_id UUID REFERENCES public.mystery_shopper_submissions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key from submissions to vouchers
ALTER TABLE public.mystery_shopper_submissions
ADD CONSTRAINT mystery_shopper_submissions_voucher_id_fkey
FOREIGN KEY (voucher_id) REFERENCES public.vouchers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.mystery_shopper_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_shopper_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_shopper_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mystery_shopper_templates
CREATE POLICY "Users can view templates in their company"
ON public.mystery_shopper_templates FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Managers can manage templates"
ON public.mystery_shopper_templates FOR ALL
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')))
WITH CHECK (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

CREATE POLICY "Public can view active templates by token"
ON public.mystery_shopper_templates FOR SELECT
USING (is_active = true);

-- RLS Policies for mystery_shopper_questions
CREATE POLICY "Users can view questions for their company templates"
ON public.mystery_shopper_questions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM mystery_shopper_templates t
  WHERE t.id = mystery_shopper_questions.template_id
  AND (t.company_id = get_user_company_id(auth.uid()) OR t.is_active = true)
));

CREATE POLICY "Managers can manage questions"
ON public.mystery_shopper_questions FOR ALL
USING (EXISTS (
  SELECT 1 FROM mystery_shopper_templates t
  WHERE t.id = mystery_shopper_questions.template_id
  AND t.company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM mystery_shopper_templates t
  WHERE t.id = mystery_shopper_questions.template_id
  AND t.company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
));

-- RLS Policies for mystery_shopper_submissions
CREATE POLICY "Users can view submissions in their company"
ON public.mystery_shopper_submissions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Public can create submissions for active templates"
ON public.mystery_shopper_submissions FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM mystery_shopper_templates t
  WHERE t.id = mystery_shopper_submissions.template_id
  AND t.is_active = true
  AND t.company_id = mystery_shopper_submissions.company_id
));

-- RLS Policies for vouchers
CREATE POLICY "Users can view vouchers in their company"
ON public.vouchers FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Public can view vouchers by code"
ON public.vouchers FOR SELECT
USING (true);

CREATE POLICY "Public can create vouchers via submission"
ON public.vouchers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Managers can update vouchers"
ON public.vouchers FOR UPDATE
USING (company_id = get_user_company_id(auth.uid()) AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')));

-- Indexes for performance
CREATE INDEX idx_mystery_shopper_templates_company ON public.mystery_shopper_templates(company_id);
CREATE INDEX idx_mystery_shopper_templates_token ON public.mystery_shopper_templates(public_token);
CREATE INDEX idx_mystery_shopper_questions_template ON public.mystery_shopper_questions(template_id);
CREATE INDEX idx_mystery_shopper_submissions_template ON public.mystery_shopper_submissions(template_id);
CREATE INDEX idx_mystery_shopper_submissions_company ON public.mystery_shopper_submissions(company_id);
CREATE INDEX idx_vouchers_company ON public.vouchers(company_id);
CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_status ON public.vouchers(status);

-- Trigger for updated_at
CREATE TRIGGER update_mystery_shopper_templates_updated_at
BEFORE UPDATE ON public.mystery_shopper_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mystery_shopper_questions_updated_at
BEFORE UPDATE ON public.mystery_shopper_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
BEFORE UPDATE ON public.vouchers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();