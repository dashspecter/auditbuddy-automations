
-- Platform-wide audit log table
CREATE TABLE public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  description text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_audit_log_company ON public.platform_audit_log(company_id);
CREATE INDEX idx_platform_audit_log_created ON public.platform_audit_log(created_at DESC);
CREATE INDEX idx_platform_audit_log_user ON public.platform_audit_log(user_id);
CREATE INDEX idx_platform_audit_log_table ON public.platform_audit_log(table_name);

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company owners and admins can view audit logs"
ON public.platform_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.user_id = auth.uid()
    AND cu.company_id = platform_audit_log.company_id
    AND cu.company_role IN ('company_owner', 'company_admin')
  )
);

CREATE POLICY "System can insert audit logs"
ON public.platform_audit_log
FOR INSERT
WITH CHECK (true);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.fn_platform_audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    v_old := to_jsonb(OLD);
    v_new := NULL;
    v_record_id := OLD.id::text;
    v_company_id := CASE WHEN v_old ? 'company_id' THEN (v_old->>'company_id')::uuid ELSE NULL END;
  ELSIF TG_OP = 'INSERT' THEN
    v_old := NULL;
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::text;
    v_company_id := CASE WHEN v_new ? 'company_id' THEN (v_new->>'company_id')::uuid ELSE NULL END;
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := NEW.id::text;
    v_company_id := CASE WHEN v_new ? 'company_id' THEN (v_new->>'company_id')::uuid ELSE NULL END;
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
$$;

-- Attach triggers to key tables
CREATE TRIGGER audit_shifts AFTER INSERT OR UPDATE OR DELETE ON public.shifts FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_schedule_periods AFTER INSERT OR UPDATE OR DELETE ON public.schedule_periods FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_schedule_change_requests AFTER INSERT OR UPDATE OR DELETE ON public.schedule_change_requests FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_employees AFTER INSERT OR UPDATE OR DELETE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_attendance_logs AFTER INSERT OR UPDATE OR DELETE ON public.attendance_logs FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_time_off_requests AFTER INSERT OR UPDATE OR DELETE ON public.time_off_requests FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_company_users AFTER INSERT OR UPDATE OR DELETE ON public.company_users FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_workforce_policies AFTER INSERT OR UPDATE OR DELETE ON public.workforce_policies FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_workforce_exceptions AFTER INSERT OR UPDATE OR DELETE ON public.workforce_exceptions FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_location_audits AFTER INSERT OR UPDATE OR DELETE ON public.location_audits FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_tasks AFTER INSERT OR UPDATE OR DELETE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_locations AFTER INSERT OR UPDATE OR DELETE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_inventory_items AFTER INSERT OR UPDATE OR DELETE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_waste_entries AFTER INSERT OR UPDATE OR DELETE ON public.waste_entries FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_equipment AFTER INSERT OR UPDATE OR DELETE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_cmms_work_orders AFTER INSERT OR UPDATE OR DELETE ON public.cmms_work_orders FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
CREATE TRIGGER audit_company_role_permissions AFTER INSERT OR UPDATE OR DELETE ON public.company_role_permissions FOR EACH ROW EXECUTE FUNCTION public.fn_platform_audit_trigger();
