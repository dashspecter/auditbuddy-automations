-- Drop ALL triggers first (including the one with different name)
DROP TRIGGER IF EXISTS compute_waste_entry_cost_trigger ON public.waste_entries;
DROP TRIGGER IF EXISTS update_waste_rollup_trigger ON public.waste_entries;
DROP TRIGGER IF EXISTS update_waste_daily_rollup_trigger ON public.waste_entries;

-- Drop the functions with CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS public.compute_waste_entry_cost() CASCADE;
DROP FUNCTION IF EXISTS public.update_waste_daily_rollup() CASCADE;

-- Now rename weight_g to weight_kg in waste_entries
ALTER TABLE public.waste_entries 
  RENAME COLUMN weight_g TO weight_kg;

-- Update existing data: convert grams to kg (divide by 1000)
UPDATE public.waste_entries 
  SET weight_kg = weight_kg / 1000.0;

-- Rename total_weight_g to total_weight_kg in waste_daily_rollups
ALTER TABLE public.waste_daily_rollups 
  RENAME COLUMN total_weight_g TO total_weight_kg;

-- Update existing rollup data: convert grams to kg
UPDATE public.waste_daily_rollups 
  SET total_weight_kg = total_weight_kg / 1000.0;

-- Update the threshold type value (change daily_weight_g to daily_weight_kg)
UPDATE public.waste_thresholds 
  SET threshold_type = 'daily_weight_kg',
      threshold_value = threshold_value / 1000.0
  WHERE threshold_type = 'daily_weight_g';

-- Recreate the cost calculation function with weight_kg
CREATE OR REPLACE FUNCTION public.compute_waste_entry_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_product RECORD;
BEGIN
  -- Get the product info
  SELECT unit_cost, cost_model INTO v_product
  FROM public.waste_products
  WHERE id = NEW.waste_product_id;
  
  -- Store the unit cost used at time of entry
  NEW.unit_cost_used := COALESCE(v_product.unit_cost, 0);
  
  -- Calculate cost based on cost model
  -- per_kg: unit_cost is per kg, weight_kg is in kg
  IF v_product.cost_model = 'per_kg' THEN
    NEW.cost_total := NEW.weight_kg * v_product.unit_cost;
  ELSE
    -- per_unit: fixed cost per unit
    NEW.cost_total := COALESCE(v_product.unit_cost, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate cost trigger
CREATE TRIGGER compute_waste_entry_cost_trigger
  BEFORE INSERT OR UPDATE ON public.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_waste_entry_cost();

-- Recreate the daily rollup function with weight_kg
CREATE OR REPLACE FUNCTION public.update_waste_daily_rollup()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_location_id UUID;
  v_rollup_date DATE;
  v_cost_delta NUMERIC;
  v_weight_delta NUMERIC;
  v_tz TEXT := 'Europe/Bucharest';
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_location_id := NEW.location_id;
    v_rollup_date := (NEW.occurred_at AT TIME ZONE v_tz)::DATE;
    
    IF NEW.status = 'recorded' THEN
      INSERT INTO public.waste_daily_rollups (company_id, location_id, rollup_date, total_weight_kg, total_cost, entry_count)
      VALUES (v_company_id, v_location_id, v_rollup_date, NEW.weight_kg, NEW.cost_total, 1)
      ON CONFLICT (company_id, location_id, rollup_date) DO UPDATE SET
        total_weight_kg = waste_daily_rollups.total_weight_kg + NEW.weight_kg,
        total_cost = waste_daily_rollups.total_cost + NEW.cost_total,
        entry_count = waste_daily_rollups.entry_count + 1,
        updated_at = now();
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_company_id := NEW.company_id;
    v_location_id := NEW.location_id;
    v_rollup_date := (NEW.occurred_at AT TIME ZONE v_tz)::DATE;
    
    -- Handle status change (void/unvoid)
    IF OLD.status = 'recorded' AND NEW.status = 'voided' THEN
      -- Entry was voided, subtract from rollup
      UPDATE public.waste_daily_rollups SET
        total_weight_kg = total_weight_kg - OLD.weight_kg,
        total_cost = total_cost - OLD.cost_total,
        entry_count = entry_count - 1,
        updated_at = now()
      WHERE company_id = v_company_id 
        AND location_id = v_location_id 
        AND rollup_date = v_rollup_date;
    ELSIF OLD.status = 'voided' AND NEW.status = 'recorded' THEN
      -- Entry was unvoided, add back to rollup
      INSERT INTO public.waste_daily_rollups (company_id, location_id, rollup_date, total_weight_kg, total_cost, entry_count)
      VALUES (v_company_id, v_location_id, v_rollup_date, NEW.weight_kg, NEW.cost_total, 1)
      ON CONFLICT (company_id, location_id, rollup_date) DO UPDATE SET
        total_weight_kg = waste_daily_rollups.total_weight_kg + NEW.weight_kg,
        total_cost = waste_daily_rollups.total_cost + NEW.cost_total,
        entry_count = waste_daily_rollups.entry_count + 1,
        updated_at = now();
    ELSIF OLD.status = 'recorded' AND NEW.status = 'recorded' THEN
      -- Entry was updated, adjust delta
      v_weight_delta := NEW.weight_kg - OLD.weight_kg;
      v_cost_delta := NEW.cost_total - OLD.cost_total;
      
      UPDATE public.waste_daily_rollups SET
        total_weight_kg = total_weight_kg + v_weight_delta,
        total_cost = total_cost + v_cost_delta,
        updated_at = now()
      WHERE company_id = v_company_id 
        AND location_id = v_location_id 
        AND rollup_date = v_rollup_date;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
    v_location_id := OLD.location_id;
    v_rollup_date := (OLD.occurred_at AT TIME ZONE v_tz)::DATE;
    
    IF OLD.status = 'recorded' THEN
      UPDATE public.waste_daily_rollups SET
        total_weight_kg = total_weight_kg - OLD.weight_kg,
        total_cost = total_cost - OLD.cost_total,
        entry_count = entry_count - 1,
        updated_at = now()
      WHERE company_id = v_company_id 
        AND location_id = v_location_id 
        AND rollup_date = v_rollup_date;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate rollup trigger
CREATE TRIGGER update_waste_daily_rollup_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.waste_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_waste_daily_rollup();

-- Update the get_waste_report function to use weight_kg
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
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_kpis JSON;
  v_top_products JSON;
  v_by_category JSON;
  v_by_reason JSON;
  v_daily_trend JSON;
BEGIN
  -- Calculate KPIs
  SELECT json_build_object(
    'total_weight_kg', COALESCE(SUM(e.weight_kg), 0),
    'total_cost', COALESCE(SUM(e.cost_total), 0),
    'entry_count', COUNT(*),
    'avg_cost_per_entry', CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(e.cost_total), 0) / COUNT(*) ELSE 0 END
  ) INTO v_kpis
  FROM public.waste_entries e
  JOIN public.waste_products p ON e.waste_product_id = p.id
  WHERE e.company_id = p_company_id
    AND e.status = 'recorded'
    AND (p_location_ids IS NULL OR e.location_id = ANY(p_location_ids))
    AND (p_from IS NULL OR e.occurred_at >= p_from)
    AND (p_to IS NULL OR e.occurred_at <= p_to)
    AND (p_product_id IS NULL OR e.waste_product_id = p_product_id)
    AND (p_reason_id IS NULL OR e.waste_reason_id = p_reason_id)
    AND (p_user_id IS NULL OR e.created_by = p_user_id)
    AND (p_category IS NULL OR p.category = p_category);

  -- Top products by cost
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_top_products
  FROM (
    SELECT 
      p.id,
      p.name,
      p.category,
      SUM(e.weight_kg) as weight_kg,
      SUM(e.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries e
    JOIN public.waste_products p ON e.waste_product_id = p.id
    WHERE e.company_id = p_company_id
      AND e.status = 'recorded'
      AND (p_location_ids IS NULL OR e.location_id = ANY(p_location_ids))
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
      AND (p_product_id IS NULL OR e.waste_product_id = p_product_id)
      AND (p_reason_id IS NULL OR e.waste_reason_id = p_reason_id)
      AND (p_user_id IS NULL OR e.created_by = p_user_id)
      AND (p_category IS NULL OR p.category = p_category)
    GROUP BY p.id, p.name, p.category
    ORDER BY SUM(e.cost_total) DESC
    LIMIT 20
  ) t;

  -- By category
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_by_category
  FROM (
    SELECT 
      COALESCE(p.category, 'Uncategorized') as category,
      SUM(e.weight_kg) as weight_kg,
      SUM(e.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries e
    JOIN public.waste_products p ON e.waste_product_id = p.id
    WHERE e.company_id = p_company_id
      AND e.status = 'recorded'
      AND (p_location_ids IS NULL OR e.location_id = ANY(p_location_ids))
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
      AND (p_product_id IS NULL OR e.waste_product_id = p_product_id)
      AND (p_reason_id IS NULL OR e.waste_reason_id = p_reason_id)
      AND (p_user_id IS NULL OR e.created_by = p_user_id)
      AND (p_category IS NULL OR p.category = p_category)
    GROUP BY p.category
    ORDER BY SUM(e.cost_total) DESC
  ) t;

  -- By reason
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_by_reason
  FROM (
    SELECT 
      COALESCE(r.name, 'No Reason') as reason,
      SUM(e.weight_kg) as weight_kg,
      SUM(e.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries e
    LEFT JOIN public.waste_reasons r ON e.waste_reason_id = r.id
    JOIN public.waste_products p ON e.waste_product_id = p.id
    WHERE e.company_id = p_company_id
      AND e.status = 'recorded'
      AND (p_location_ids IS NULL OR e.location_id = ANY(p_location_ids))
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
      AND (p_product_id IS NULL OR e.waste_product_id = p_product_id)
      AND (p_reason_id IS NULL OR e.waste_reason_id = p_reason_id)
      AND (p_user_id IS NULL OR e.created_by = p_user_id)
      AND (p_category IS NULL OR p.category = p_category)
    GROUP BY r.name
    ORDER BY SUM(e.cost_total) DESC
  ) t;

  -- Daily trend
  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json) INTO v_daily_trend
  FROM (
    SELECT 
      DATE(e.occurred_at AT TIME ZONE 'Europe/Bucharest') as day,
      SUM(e.weight_kg) as weight_kg,
      SUM(e.cost_total) as cost,
      COUNT(*) as entries
    FROM public.waste_entries e
    JOIN public.waste_products p ON e.waste_product_id = p.id
    WHERE e.company_id = p_company_id
      AND e.status = 'recorded'
      AND (p_location_ids IS NULL OR e.location_id = ANY(p_location_ids))
      AND (p_from IS NULL OR e.occurred_at >= p_from)
      AND (p_to IS NULL OR e.occurred_at <= p_to)
      AND (p_product_id IS NULL OR e.waste_product_id = p_product_id)
      AND (p_reason_id IS NULL OR e.waste_reason_id = p_reason_id)
      AND (p_user_id IS NULL OR e.created_by = p_user_id)
      AND (p_category IS NULL OR p.category = p_category)
    GROUP BY DATE(e.occurred_at AT TIME ZONE 'Europe/Bucharest')
  ) t;

  -- Build final result
  v_result := json_build_object(
    'kpis', v_kpis,
    'top_products', v_top_products,
    'by_category', v_by_category,
    'by_reason', v_by_reason,
    'daily_trend', v_daily_trend
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;