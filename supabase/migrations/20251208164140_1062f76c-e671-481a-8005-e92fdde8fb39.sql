-- Template Marketplace: Categories
CREATE TABLE public.marketplace_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  parent_id UUID REFERENCES public.marketplace_categories(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;

-- Categories are public
CREATE POLICY "Anyone can view categories" ON public.marketplace_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.marketplace_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Template Marketplace: Main templates table
CREATE TABLE public.marketplace_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL, -- 'audit', 'sop', 'maintenance', 'training'
  category_id UUID REFERENCES public.marketplace_categories(id),
  industry_id UUID REFERENCES public.industries(id),
  author_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  author_company_name TEXT,
  
  -- Template content (JSON structure for flexibility)
  content JSONB NOT NULL DEFAULT '{}',
  
  -- Visibility and status
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  
  -- Metrics
  download_count INTEGER NOT NULL DEFAULT 0,
  rating_sum NUMERIC NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC GENERATED ALWAYS AS (
    CASE WHEN rating_count > 0 THEN rating_sum / rating_count ELSE 0 END
  ) STORED,
  
  -- Versioning
  version TEXT NOT NULL DEFAULT '1.0',
  
  -- SEO and sharing
  slug TEXT NOT NULL,
  share_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  preview_image_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint on slug
  CONSTRAINT unique_template_slug UNIQUE (slug)
);

-- Enable RLS
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view published templates
CREATE POLICY "Anyone can view published templates" ON public.marketplace_templates
  FOR SELECT USING (is_published = true);

-- Authors can view their own templates
CREATE POLICY "Authors can view own templates" ON public.marketplace_templates
  FOR SELECT USING (author_id = auth.uid());

-- Authors can create templates
CREATE POLICY "Authenticated users can create templates" ON public.marketplace_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND author_id = auth.uid());

-- Authors can update their own templates
CREATE POLICY "Authors can update own templates" ON public.marketplace_templates
  FOR UPDATE USING (author_id = auth.uid());

-- Authors can delete their own unpublished templates
CREATE POLICY "Authors can delete own unpublished templates" ON public.marketplace_templates
  FOR DELETE USING (author_id = auth.uid() AND is_published = false);

-- Admins can manage all templates
CREATE POLICY "Admins can manage all templates" ON public.marketplace_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Template Ratings
CREATE TABLE public.marketplace_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One rating per user per template
  CONSTRAINT unique_user_template_rating UNIQUE (template_id, user_id)
);

-- Enable RLS
ALTER TABLE public.marketplace_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings
CREATE POLICY "Anyone can view ratings" ON public.marketplace_ratings
  FOR SELECT USING (true);

-- Authenticated users can rate templates
CREATE POLICY "Users can create ratings" ON public.marketplace_ratings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Users can update their own ratings
CREATE POLICY "Users can update own ratings" ON public.marketplace_ratings
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own ratings
CREATE POLICY "Users can delete own ratings" ON public.marketplace_ratings
  FOR DELETE USING (user_id = auth.uid());

-- Template Downloads/Installations
CREATE TABLE public.marketplace_downloads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.marketplace_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  installed_template_id UUID, -- Reference to the created audit_template/etc
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_downloads ENABLE ROW LEVEL SECURITY;

-- Users can view their own downloads
CREATE POLICY "Users can view own downloads" ON public.marketplace_downloads
  FOR SELECT USING (user_id = auth.uid());

-- Users can create downloads
CREATE POLICY "Users can create downloads" ON public.marketplace_downloads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Admins can view all downloads
CREATE POLICY "Admins can view all downloads" ON public.marketplace_downloads
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update template metrics after rating
CREATE OR REPLACE FUNCTION public.update_template_rating_metrics()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.marketplace_templates
    SET rating_sum = rating_sum + NEW.rating,
        rating_count = rating_count + 1,
        updated_at = now()
    WHERE id = NEW.template_id;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.marketplace_templates
    SET rating_sum = rating_sum - OLD.rating + NEW.rating,
        updated_at = now()
    WHERE id = NEW.template_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.marketplace_templates
    SET rating_sum = rating_sum - OLD.rating,
        rating_count = rating_count - 1,
        updated_at = now()
    WHERE id = OLD.template_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for rating metrics
CREATE TRIGGER update_rating_metrics
AFTER INSERT OR UPDATE OR DELETE ON public.marketplace_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_template_rating_metrics();

-- Function to increment download count
CREATE OR REPLACE FUNCTION public.increment_template_downloads()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketplace_templates
  SET download_count = download_count + 1,
      updated_at = now()
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for download count
CREATE TRIGGER increment_downloads
AFTER INSERT ON public.marketplace_downloads
FOR EACH ROW EXECUTE FUNCTION public.increment_template_downloads();

-- Create indexes for performance
CREATE INDEX idx_marketplace_templates_type ON public.marketplace_templates(template_type);
CREATE INDEX idx_marketplace_templates_category ON public.marketplace_templates(category_id);
CREATE INDEX idx_marketplace_templates_industry ON public.marketplace_templates(industry_id);
CREATE INDEX idx_marketplace_templates_published ON public.marketplace_templates(is_published);
CREATE INDEX idx_marketplace_templates_featured ON public.marketplace_templates(is_featured);
CREATE INDEX idx_marketplace_templates_downloads ON public.marketplace_templates(download_count DESC);
CREATE INDEX idx_marketplace_templates_rating ON public.marketplace_templates(average_rating DESC);
CREATE INDEX idx_marketplace_templates_created ON public.marketplace_templates(created_at DESC);
CREATE INDEX idx_marketplace_templates_slug ON public.marketplace_templates(slug);
CREATE INDEX idx_marketplace_templates_share_token ON public.marketplace_templates(share_token);

-- Insert default categories
INSERT INTO public.marketplace_categories (name, slug, description, icon, display_order) VALUES
  ('Food Safety', 'food-safety', 'HACCP, hygiene, and food handling templates', 'Utensils', 1),
  ('Equipment Maintenance', 'equipment-maintenance', 'Maintenance schedules and checklists', 'Wrench', 2),
  ('Staff Training', 'staff-training', 'Onboarding and training programs', 'GraduationCap', 3),
  ('Safety & Compliance', 'safety-compliance', 'Health and safety audits', 'Shield', 4),
  ('Quality Control', 'quality-control', 'Quality assurance checklists', 'CheckCircle', 5),
  ('Opening & Closing', 'opening-closing', 'Daily operational procedures', 'Clock', 6),
  ('Customer Service', 'customer-service', 'Service standards and protocols', 'Users', 7),
  ('Inventory Management', 'inventory-management', 'Stock control and ordering', 'Package', 8);