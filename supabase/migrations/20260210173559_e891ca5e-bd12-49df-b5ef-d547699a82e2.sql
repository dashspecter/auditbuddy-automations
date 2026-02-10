CREATE OR REPLACE FUNCTION public.update_waste_daily_rollup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_location_id UUID;
  v_day DATE;
  v_cost_delta NUMERIC;
  v_weight_delta NUMERIC;
  v_tz TEXT := 'Europe/Bucharest';
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_company_id := NEW.company_id;
    v_location_id := NEW.location_id;
    v_day := (NEW.occurred_at AT TIME ZONE v_tz)::DATE;
    
    IF NEW.status = 'recorded' THEN
      INSERT INTO public.waste_daily_rollups (company_id, location_id, day, total_weight_kg, total_cost, entry_count)
      VALUES (v_company_id, v_location_id, v_day, NEW.weight_kg, NEW.cost_total, 1)
      ON CONFLICT (company_id, location_id, day) DO UPDATE SET
        total_weight_kg = waste_daily_rollups.total_weight_kg + NEW.weight_kg,
        total_cost = waste_daily_rollups.total_cost + NEW.cost_total,
        entry_count = waste_daily_rollups.entry_count + 1;
    END IF;
    
  ELSIF TG_OP = 'UPDATE' THEN
    v_company_id := NEW.company_id;
    v_location_id := NEW.location_id;
    v_day := (NEW.occurred_at AT TIME ZONE v_tz)::DATE;
    
    IF OLD.status = 'recorded' AND NEW.status = 'voided' THEN
      UPDATE public.waste_daily_rollups SET
        total_weight_kg = total_weight_kg - OLD.weight_kg,
        total_cost = total_cost - OLD.cost_total,
        entry_count = entry_count - 1
      WHERE company_id = v_company_id 
        AND location_id = v_location_id 
        AND day = v_day;
    ELSIF OLD.status = 'voided' AND NEW.status = 'recorded' THEN
      INSERT INTO public.waste_daily_rollups (company_id, location_id, day, total_weight_kg, total_cost, entry_count)
      VALUES (v_company_id, v_location_id, v_day, NEW.weight_kg, NEW.cost_total, 1)
      ON CONFLICT (company_id, location_id, day) DO UPDATE SET
        total_weight_kg = waste_daily_rollups.total_weight_kg + NEW.weight_kg,
        total_cost = waste_daily_rollups.total_cost + NEW.cost_total,
        entry_count = waste_daily_rollups.entry_count + 1;
    ELSIF OLD.status = 'recorded' AND NEW.status = 'recorded' THEN
      v_weight_delta := NEW.weight_kg - OLD.weight_kg;
      v_cost_delta := NEW.cost_total - OLD.cost_total;
      
      UPDATE public.waste_daily_rollups SET
        total_weight_kg = total_weight_kg + v_weight_delta,
        total_cost = total_cost + v_cost_delta
      WHERE company_id = v_company_id 
        AND location_id = v_location_id 
        AND day = v_day;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    v_company_id := OLD.company_id;
    v_location_id := OLD.location_id;
    v_day := (OLD.occurred_at AT TIME ZONE v_tz)::DATE;
    
    IF OLD.status = 'recorded' THEN
      UPDATE public.waste_daily_rollups SET
        total_weight_kg = total_weight_kg - OLD.weight_kg,
        total_cost = total_cost - OLD.cost_total,
        entry_count = entry_count - 1
      WHERE company_id = v_company_id 
        AND location_id = v_location_id 
        AND day = v_day;
    END IF;
    
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;