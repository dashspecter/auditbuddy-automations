
-- =====================================================
-- WASTAGE MODULE - Complete Database Schema
-- =====================================================

-- 1. Waste Products Catalog
CREATE TABLE public.waste_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  uom TEXT NOT NULL DEFAULT 'g',
  cost_model TEXT NOT NULL DEFAULT 'per_kg' CHECK (cost_model IN ('per_kg', 'per_unit')),
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  photo_hint_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for waste_products
CREATE INDEX idx_waste_products_company_active ON public.waste_products(company_id, active);
CREATE INDEX idx_waste_products_company_category ON public.waste_products(company_id, category);
CREATE INDEX idx_waste_products_name ON public.waste_products(company_id, name);

-- Trigger for updated_at
CREATE TRIGGER update_waste_products_updated_at
  BEFORE UPDATE ON public.waste_products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 2. Waste Reasons
CREATE TABLE public.waste_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for waste_reasons
CREATE INDEX idx_waste_reasons_company_active ON public.waste_reasons(company_id, active);
CREATE INDEX idx_waste_reasons_company_order ON public.waste_reasons(company_id, sort_order);

-- 3. Waste Entries (main log table)
CREATE TABLE public.waste_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  waste_product_id UUID NOT NULL REFERENCES public.waste_products(id) ON DELETE RESTRICT,
  waste_reason_id UUID REFERENCES public.waste_reasons(id) ON DELETE SET NULL,
  weight_g NUMERIC NOT NULL CHECK (weight_g > 0),
  unit_cost_used NUMERIC NOT NULL DEFAULT 0,
  cost_total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'voided')),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES public.profiles(id),
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for waste_entries
CREATE INDEX idx_waste_entries_company_location_date ON public.waste_entries(company_id, location_id, occurred_at DESC);
CREATE INDEX idx_waste_entries_company_date ON public.waste_entries(company_id, occurred_at DESC);
CREATE INDEX idx_waste_entries_product_date ON public.waste_entries(waste_product_id, occurred_at DESC);
CREATE INDEX idx_waste_entries_creator_date ON public.waste_entries(created_by, occurred_at DESC);
CREATE INDEX idx_waste_entries_status ON public.waste_entries(status);

-- 4. Waste Daily Rollups (for fast reporting)
CREATE TABLE public.waste_daily_rollups (
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  total_weight_g NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  entry_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, location_id, day)
);

-- Index for rollup queries
CREATE INDEX idx_waste_daily_rollups_day ON public.waste_daily_rollups(company_id, day);

-- 5. Waste Thresholds (scaffolding for future insights)
CREATE TABLE public.waste_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  category TEXT,
  waste_product_id UUID REFERENCES public.waste_products(id) ON DELETE CASCADE,
  threshold_type TEXT NOT NULL DEFAULT 'daily_cost' CHECK (threshold_type IN ('daily_cost', 'daily_weight_g')),
  threshold_value NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_waste_thresholds_company ON public.waste_thresholds(company_id, active);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to compute waste entry cost
CREATE OR REPLACE FUNCTION public.compute_waste_entry_cost()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
BEGIN
  -- Get product details
  SELECT unit_cost, cost_model INTO v_product
  FROM public.waste_products
  WHERE id = NEW.waste_product_id;
  
  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Waste product not found';
  END IF;
  
  -- Store the unit cost used at time of entry
  NEW.unit_cost_used := v_product.unit_cost;
  
  -- Calculate total cost based on cost model
  IF v_product.cost_model = 'per_kg' THEN
    -- weight_g / 1000 * unit_cost_per_kg
    NEW.cost_total := (NEW.weight_g / 1000.0) * v_product.unit_cost;
  ELSE
    -- per_unit: treat weight_g as count for v1
    NEW.cost_total := NEW.weight_g * v_product.unit_cost;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-compute cost on insert/update
CREATE TRIGGER compute_waste_entry_cost_trigger
  BEFORE INSERT OR UPDATE OF waste_product_id, weight_g ON public.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_waste_entry_cost();

-- Function to update daily rollups
CREATE OR REPLACE FUNCTION public.update_waste_daily_rollup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day DATE;
  v_company_id UUID;
  v_location_id UUID;
  v_weight_delta NUMERIC;
  v_cost_delta NUMERIC;
  v_count_delta INT;
BEGIN
  -- Only process recorded entries
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'recorded' THEN
      v_day := (NEW.occurred_at AT TIME ZONE 'UTC')::date;
      v_company_id := NEW.company_id;
      v_location_id := NEW.location_id;
      v_weight_delta := NEW.weight_g;
      v_cost_delta := NEW.cost_total;
      v_count_delta := 1;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status change to voided
    IF OLD.status = 'recorded' AND NEW.status = 'voided' THEN
      v_day := (OLD.occurred_at AT TIME ZONE 'UTC')::date;
      v_company_id := OLD.company_id;
      v_location_id := OLD.location_id;
      v_weight_delta := -OLD.weight_g;
      v_cost_delta := -OLD.cost_total;
      v_count_delta := -1;
    -- Handle status change from voided to recorded
    ELSIF OLD.status = 'voided' AND NEW.status = 'recorded' THEN
      v_day := (NEW.occurred_at AT TIME ZONE 'UTC')::date;
      v_company_id := NEW.company_id;
      v_location_id := NEW.location_id;
      v_weight_delta := NEW.weight_g;
      v_cost_delta := NEW.cost_total;
      v_count_delta := 1;
    -- Handle weight/cost change on recorded entry
    ELSIF OLD.status = 'recorded' AND NEW.status = 'recorded' THEN
      v_day := (NEW.occurred_at AT TIME ZONE 'UTC')::date;
      v_company_id := NEW.company_id;
      v_location_id := NEW.location_id;
      v_weight_delta := NEW.weight_g - OLD.weight_g;
      v_cost_delta := NEW.cost_total - OLD.cost_total;
      v_count_delta := 0;
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'recorded' THEN
      v_day := (OLD.occurred_at AT TIME ZONE 'UTC')::date;
      v_company_id := OLD.company_id;
      v_location_id := OLD.location_id;
      v_weight_delta := -OLD.weight_g;
      v_cost_delta := -OLD.cost_total;
      v_count_delta := -1;
    ELSE
      RETURN OLD;
    END IF;
  END IF;
  
  -- Upsert the rollup
  INSERT INTO public.waste_daily_rollups (company_id, location_id, day, total_weight_g, total_cost, entry_count)
  VALUES (v_company_id, v_location_id, v_day, v_weight_delta, v_cost_delta, v_count_delta)
  ON CONFLICT (company_id, location_id, day) DO UPDATE SET
    total_weight_g = public.waste_daily_rollups.total_weight_g + EXCLUDED.total_weight_g,
    total_cost = public.waste_daily_rollups.total_cost + EXCLUDED.total_cost,
    entry_count = public.waste_daily_rollups.entry_count + EXCLUDED.entry_count;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger for rollup maintenance
CREATE TRIGGER update_waste_daily_rollup_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waste_daily_rollup();

-- =====================================================
-- RPC FUNCTION FOR WASTE REPORTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_waste_report(
  p_company_id UUID,
  p_location_ids UUID[] DEFAULT NULL,
  p_from TIMESTAMPTZ DEFAULT NULL,
  p_to TIMESTAMPTZ DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_reason_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_kpis JSON;
  v_top_products JSON;
  v_by_category JSON;
  v_by_reason JSON;
  v_daily_trend JSON;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
BEGIN
  -- Default date range to last 30 days
  v_from := COALESCE(p_from, now() - INTERVAL '30 days');
  v_to := COALESCE(p_to, now());
  
  -- KPIs
  SELECT json_build_object(
    'total_weight_kg', COALESCE(SUM(weight_g) / 1000.0, 0),
    'total_cost', COALESCE(SUM(cost_total), 0),
    'entry_count', COUNT(*),
    'avg_cost_per_entry', CASE WHEN COUNT(*) > 0 THEN SUM(cost_total) / COUNT(*) ELSE 0 END
  ) INTO v_kpis
  FROM public.waste_entries we
  JOIN public.waste_products wp ON we.waste_product_id = wp.id
  WHERE we.company_id = p_company_id
    AND we.status = 'recorded'
    AND we.occurred_at >= v_from
    AND we.occurred_at <= v_to
    AND (p_location_ids IS NULL OR we.location_id = ANY(p_location_ids))
    AND (p_product_id IS NULL OR we.waste_product_id = p_product_id)
    AND (p_reason_id IS NULL OR we.waste_reason_id = p_reason_id)
    AND (p_user_id IS NULL OR we.created_by = p_user_id)
    AND (p_category IS NULL OR wp.category = p_category);
  
  -- Top products by cost
  SELECT COALESCE(json_agg(row_to_json(t)), '[]')
  INTO v_top_products
  FROM (
    SELECT 
      wp.id,
      wp.name,
      wp.category,
      SUM(we.weight_g) / 1000.0 as weight_kg,
      SUM(we.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries we
    JOIN public.waste_products wp ON we.waste_product_id = wp.id
    WHERE we.company_id = p_company_id
      AND we.status = 'recorded'
      AND we.occurred_at >= v_from
      AND we.occurred_at <= v_to
      AND (p_location_ids IS NULL OR we.location_id = ANY(p_location_ids))
      AND (p_category IS NULL OR wp.category = p_category)
    GROUP BY wp.id, wp.name, wp.category
    ORDER BY cost DESC
    LIMIT 10
  ) t;
  
  -- Breakdown by category
  SELECT COALESCE(json_agg(row_to_json(t)), '[]')
  INTO v_by_category
  FROM (
    SELECT 
      COALESCE(wp.category, 'Uncategorized') as category,
      SUM(we.weight_g) / 1000.0 as weight_kg,
      SUM(we.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries we
    JOIN public.waste_products wp ON we.waste_product_id = wp.id
    WHERE we.company_id = p_company_id
      AND we.status = 'recorded'
      AND we.occurred_at >= v_from
      AND we.occurred_at <= v_to
      AND (p_location_ids IS NULL OR we.location_id = ANY(p_location_ids))
    GROUP BY COALESCE(wp.category, 'Uncategorized')
    ORDER BY cost DESC
  ) t;
  
  -- Breakdown by reason
  SELECT COALESCE(json_agg(row_to_json(t)), '[]')
  INTO v_by_reason
  FROM (
    SELECT 
      COALESCE(wr.name, 'No Reason') as reason,
      SUM(we.weight_g) / 1000.0 as weight_kg,
      SUM(we.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries we
    LEFT JOIN public.waste_reasons wr ON we.waste_reason_id = wr.id
    WHERE we.company_id = p_company_id
      AND we.status = 'recorded'
      AND we.occurred_at >= v_from
      AND we.occurred_at <= v_to
      AND (p_location_ids IS NULL OR we.location_id = ANY(p_location_ids))
    GROUP BY COALESCE(wr.name, 'No Reason')
    ORDER BY cost DESC
  ) t;
  
  -- Daily trend
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]')
  INTO v_daily_trend
  FROM (
    SELECT 
      (we.occurred_at AT TIME ZONE 'UTC')::date as day,
      SUM(we.weight_g) / 1000.0 as weight_kg,
      SUM(we.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries we
    WHERE we.company_id = p_company_id
      AND we.status = 'recorded'
      AND we.occurred_at >= v_from
      AND we.occurred_at <= v_to
      AND (p_location_ids IS NULL OR we.location_id = ANY(p_location_ids))
    GROUP BY (we.occurred_at AT TIME ZONE 'UTC')::date
  ) t;
  
  -- Combine results
  v_result := json_build_object(
    'kpis', v_kpis,
    'top_products', v_top_products,
    'by_category', v_by_category,
    'by_reason', v_by_reason,
    'daily_trend', v_daily_trend
  );
  
  RETURN v_result;
END;
$$;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.waste_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_daily_rollups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_thresholds ENABLE ROW LEVEL SECURITY;

-- waste_products policies
CREATE POLICY "Users can view waste products in their company"
  ON public.waste_products FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage waste products"
  ON public.waste_products FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    (public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin'))
  );

-- waste_reasons policies
CREATE POLICY "Users can view waste reasons in their company"
  ON public.waste_reasons FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage waste reasons"
  ON public.waste_reasons FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    (public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin'))
  );

-- waste_entries policies
CREATE POLICY "Users can view waste entries in their company"
  ON public.waste_entries FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Staff can create waste entries in their company"
  ON public.waste_entries FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Admins can update waste entries"
  ON public.waste_entries FOR UPDATE
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    (public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin'))
  );

-- waste_daily_rollups policies (read-only for clients)
CREATE POLICY "Users can view waste rollups in their company"
  ON public.waste_daily_rollups FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

-- waste_thresholds policies
CREATE POLICY "Users can view waste thresholds in their company"
  ON public.waste_thresholds FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage waste thresholds"
  ON public.waste_thresholds FOR ALL
  USING (
    company_id = public.get_user_company_id(auth.uid()) AND
    (public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin'))
  );

-- =====================================================
-- STORAGE BUCKET (note: bucket creation via SQL)
-- =====================================================

-- Create private bucket for waste photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('waste-photos', 'waste-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for waste-photos bucket
CREATE POLICY "Users can upload waste photos to their company folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'waste-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
  );

CREATE POLICY "Users can view waste photos in their company folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'waste-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text
  );

CREATE POLICY "Admins can delete waste photos in their company folder"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'waste-photos' AND
    (storage.foldername(name))[1] = 'company' AND
    (storage.foldername(name))[2] = public.get_user_company_id(auth.uid())::text AND
    (public.has_company_role(auth.uid(), 'company_owner') OR public.has_company_role(auth.uid(), 'company_admin'))
  );
