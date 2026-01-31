-- =====================================================
-- WASTAGE MODULE PATCH 1
-- Fixes: timezone, RLS hardening, per_kg enforcement
-- =====================================================

-- =====================================================
-- 1. CREATE HELPER FUNCTION FOR LOCATION ACCESS
-- This mirrors the pattern used elsewhere in Dashspect
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_location_access(_user_id uuid, _location_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    -- Check if user has access via staff_locations
    SELECT 1 FROM staff_locations sl
    JOIN employees e ON sl.staff_id = e.id
    WHERE e.user_id = _user_id
      AND sl.location_id = _location_id
  ) OR EXISTS (
    -- Managers/admins have access to all locations in their company
    SELECT 1 FROM company_users cu
    JOIN locations l ON l.company_id = cu.company_id
    WHERE cu.user_id = _user_id
      AND l.id = _location_id
      AND (cu.company_role IN ('company_owner', 'company_admin')
           OR has_role(_user_id, 'admin'::app_role)
           OR has_role(_user_id, 'manager'::app_role))
  ) OR EXISTS (
    -- Employee's primary location
    SELECT 1 FROM employees e
    WHERE e.user_id = _user_id
      AND e.location_id = _location_id
  )
$$;

-- =====================================================
-- 2. UPDATE ROLLUP TRIGGER TO USE COMPANY TIMEZONE
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_waste_daily_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day DATE;
  v_company_id UUID;
  v_location_id UUID;
  v_weight_delta NUMERIC;
  v_cost_delta NUMERIC;
  v_count_delta INT;
  v_timezone TEXT;
BEGIN
  -- Get company timezone (default to Europe/Bucharest)
  v_timezone := 'Europe/Bucharest';
  
  -- Only process recorded entries
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'recorded' THEN
      v_day := (NEW.occurred_at AT TIME ZONE v_timezone)::date;
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
      v_day := (OLD.occurred_at AT TIME ZONE v_timezone)::date;
      v_company_id := OLD.company_id;
      v_location_id := OLD.location_id;
      v_weight_delta := -OLD.weight_g;
      v_cost_delta := -OLD.cost_total;
      v_count_delta := -1;
    -- Handle status change from voided to recorded
    ELSIF OLD.status = 'voided' AND NEW.status = 'recorded' THEN
      v_day := (NEW.occurred_at AT TIME ZONE v_timezone)::date;
      v_company_id := NEW.company_id;
      v_location_id := NEW.location_id;
      v_weight_delta := NEW.weight_g;
      v_cost_delta := NEW.cost_total;
      v_count_delta := 1;
    -- Handle weight/cost change on recorded entry
    ELSIF OLD.status = 'recorded' AND NEW.status = 'recorded' THEN
      v_day := (NEW.occurred_at AT TIME ZONE v_timezone)::date;
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
      v_day := (OLD.occurred_at AT TIME ZONE v_timezone)::date;
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
$function$;

-- =====================================================
-- 3. UPDATE GET_WASTE_REPORT TO USE COMPANY TIMEZONE
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_waste_report(
  p_company_id uuid, 
  p_location_ids uuid[] DEFAULT NULL::uuid[], 
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_product_id uuid DEFAULT NULL::uuid, 
  p_reason_id uuid DEFAULT NULL::uuid, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_category text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_kpis JSON;
  v_top_products JSON;
  v_by_category JSON;
  v_by_reason JSON;
  v_daily_trend JSON;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
  v_timezone TEXT;
BEGIN
  -- Use company timezone (default to Europe/Bucharest)
  v_timezone := 'Europe/Bucharest';
  
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
  
  -- Daily trend (using company timezone)
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]')
  INTO v_daily_trend
  FROM (
    SELECT 
      (we.occurred_at AT TIME ZONE v_timezone)::date as day,
      SUM(we.weight_g) / 1000.0 as weight_kg,
      SUM(we.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries we
    WHERE we.company_id = p_company_id
      AND we.status = 'recorded'
      AND we.occurred_at >= v_from
      AND we.occurred_at <= v_to
      AND (p_location_ids IS NULL OR we.location_id = ANY(p_location_ids))
    GROUP BY (we.occurred_at AT TIME ZONE v_timezone)::date
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
$function$;

-- =====================================================
-- 4. ENFORCE PER_KG COST MODEL ONLY (V1)
-- =====================================================

-- Update compute_waste_entry_cost to only support per_kg
CREATE OR REPLACE FUNCTION public.compute_waste_entry_cost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- V1: Only support per_kg cost model
  IF v_product.cost_model != 'per_kg' THEN
    RAISE EXCEPTION 'Only per_kg cost model is supported in v1';
  END IF;
  
  -- Store the unit cost used at time of entry
  NEW.unit_cost_used := v_product.unit_cost;
  
  -- Calculate total cost: weight_g / 1000 * unit_cost_per_kg
  NEW.cost_total := (NEW.weight_g / 1000.0) * v_product.unit_cost;
  
  RETURN NEW;
END;
$function$;

-- =====================================================
-- 5. HARDEN RLS POLICIES FOR WASTE_ENTRIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view waste entries in their company" ON public.waste_entries;
DROP POLICY IF EXISTS "Staff can create waste entries in their company" ON public.waste_entries;
DROP POLICY IF EXISTS "Admins can update waste entries" ON public.waste_entries;

-- SELECT: Company match + location access
CREATE POLICY "Users can view waste entries with location access"
ON public.waste_entries FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    -- Admins/managers see all in company
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner') OR
    has_company_role(auth.uid(), 'company_admin') OR
    -- User created this entry
    created_by = auth.uid() OR
    -- User has location access
    user_has_location_access(auth.uid(), location_id)
  )
);

-- INSERT: Company match + creator is current user + location access
CREATE POLICY "Staff can create waste entries with location access"
ON public.waste_entries FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
  AND user_has_location_access(auth.uid(), location_id)
);

-- UPDATE: Admin/manager only
CREATE POLICY "Admins can update waste entries"
ON public.waste_entries FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_company_role(auth.uid(), 'company_owner') OR
    has_company_role(auth.uid(), 'company_admin') OR
    -- Allow staff to update their own entry photo_path only
    (created_by = auth.uid() AND status = 'recorded')
  )
);

-- =====================================================
-- 6. ADD CHECK CONSTRAINT FOR COST MODEL IN WASTE_PRODUCTS
-- =====================================================

-- This enforces per_kg at DB level for v1
ALTER TABLE public.waste_products DROP CONSTRAINT IF EXISTS waste_products_cost_model_v1;
ALTER TABLE public.waste_products ADD CONSTRAINT waste_products_cost_model_v1 
CHECK (cost_model = 'per_kg');