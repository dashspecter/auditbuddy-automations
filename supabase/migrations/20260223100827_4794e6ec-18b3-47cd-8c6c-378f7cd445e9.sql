CREATE OR REPLACE FUNCTION public.fn_platform_audit_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_record_id text;
  v_user_id uuid;
  v_user_email text;
  v_old jsonb;
  v_new jsonb;
  v_description text;
BEGIN
  v_user_id := auth.uid();
  
  BEGIN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  EXCEPTION WHEN OTHERS THEN
    v_user_email := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD) - 'custom_data' - 'cached_section_scores';
    v_new := NULL;
    v_record_id := OLD.id::text;
    v_company_id := CASE WHEN to_jsonb(OLD) ? 'company_id' THEN (OLD.company_id)::uuid ELSE NULL END;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW) - 'custom_data' - 'cached_section_scores';
    v_record_id := NEW.id::text;
    v_company_id := CASE WHEN to_jsonb(NEW) ? 'company_id' THEN (NEW.company_id)::uuid ELSE NULL END;
  ELSE
    v_old := to_jsonb(OLD) - 'custom_data' - 'cached_section_scores';
    v_new := to_jsonb(NEW) - 'custom_data' - 'cached_section_scores';
    v_record_id := NEW.id::text;
    v_company_id := CASE WHEN to_jsonb(NEW) ? 'company_id' THEN (NEW.company_id)::uuid ELSE NULL END;
  END IF;

  v_description := TG_OP || ' on ' || TG_TABLE_NAME;

  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.platform_audit_log (
      company_id, user_id, user_email, action, table_name, record_id, description, old_data, new_data
    ) VALUES (
      v_company_id, v_user_id, v_user_email, TG_OP, TG_TABLE_NAME, v_record_id, v_description, v_old, v_new
    );
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;