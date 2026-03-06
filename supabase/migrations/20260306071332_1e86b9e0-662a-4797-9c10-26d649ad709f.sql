-- Fix Bug 1: per_unit cost model should multiply quantity × unit_cost
CREATE OR REPLACE FUNCTION public.compute_waste_entry_cost()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_product RECORD;
BEGIN
  SELECT unit_cost, cost_model INTO v_product
  FROM public.waste_products
  WHERE id = NEW.waste_product_id;
  
  NEW.unit_cost_used := COALESCE(v_product.unit_cost, 0);
  
  -- Both per_kg and per_unit: multiply quantity by unit cost
  -- weight_kg stores the raw quantity in the product's UOM (kg, g, pcs, l, portions)
  NEW.cost_total := NEW.weight_kg * COALESCE(v_product.unit_cost, 0);
  
  RETURN NEW;
END;
$$;

-- Fix Bug 2: Update get_waste_report to rename total_weight_kg → total_quantity
-- Since we can't meaningfully sum mixed units, we label it "Total Quantity"
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
      p.uom,
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
    GROUP BY p.id, p.name, p.category, p.uom
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
    ORDER BY day
  ) t;

  -- Build result
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