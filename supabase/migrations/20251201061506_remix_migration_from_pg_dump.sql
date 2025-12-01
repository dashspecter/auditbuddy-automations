CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'checker',
    'manager'
);


--
-- Name: calculate_location_audit_score(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_location_audit_score(audit_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  total_score INTEGER;
  count_fields INTEGER;
  avg_score INTEGER;
BEGIN
  SELECT 
    COALESCE(compliance_licenses, 0) + COALESCE(compliance_permits, 0) + 
    COALESCE(compliance_signage, 0) + COALESCE(compliance_documentation, 0) +
    COALESCE(boh_storage, 0) + COALESCE(boh_temperature, 0) + 
    COALESCE(boh_preparation, 0) + COALESCE(boh_equipment, 0) +
    COALESCE(cleaning_surfaces, 0) + COALESCE(cleaning_floors, 0) + 
    COALESCE(cleaning_equipment, 0) + COALESCE(cleaning_waste, 0) +
    COALESCE(foh_customer_areas, 0) + COALESCE(foh_restrooms, 0) + 
    COALESCE(foh_menu_boards, 0) + COALESCE(foh_seating, 0),
    16
  INTO total_score, count_fields
  FROM public.location_audits
  WHERE id = audit_id;
  
  -- Calculate percentage (out of 5 per field)
  avg_score := ROUND((total_score::NUMERIC / (count_fields * 5)) * 100);
  
  RETURN avg_score;
END;
$$;


--
-- Name: company_has_module(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.company_has_module(_company_id uuid, _module text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_modules
    WHERE company_id = _company_id 
      AND module_name = _module 
      AND is_active = true
  )
$$;


--
-- Name: generate_short_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_short_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;


--
-- Name: get_next_revision_number(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_revision_number(p_audit_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_max_revision INTEGER;
BEGIN
  SELECT COALESCE(MAX(revision_number), 0) + 1
  INTO v_max_revision
  FROM public.audit_revisions
  WHERE audit_id = p_audit_id;
  
  RETURN v_max_revision;
END;
$$;


--
-- Name: get_next_schedule_date(date, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_schedule_date(p_last_date date, p_pattern text, p_day_of_week integer, p_day_of_month integer) RETURNS date
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_next_date DATE;
  v_candidate_date DATE;
BEGIN
  CASE p_pattern
    WHEN 'daily' THEN
      v_next_date := COALESCE(p_last_date, CURRENT_DATE) + INTERVAL '1 day';
    
    WHEN 'weekly' THEN
      v_candidate_date := COALESCE(p_last_date, CURRENT_DATE) + INTERVAL '1 day';
      -- Find next occurrence of the specified day of week
      WHILE EXTRACT(DOW FROM v_candidate_date) != p_day_of_week LOOP
        v_candidate_date := v_candidate_date + INTERVAL '1 day';
      END LOOP;
      v_next_date := v_candidate_date;
    
    WHEN 'monthly' THEN
      v_candidate_date := COALESCE(p_last_date, CURRENT_DATE) + INTERVAL '1 month';
      -- Try to set to the specified day of month
      BEGIN
        v_next_date := DATE_TRUNC('month', v_candidate_date) + (p_day_of_month - 1) * INTERVAL '1 day';
        -- If the day doesn't exist in this month, use last day of month
        IF EXTRACT(DAY FROM v_next_date) != p_day_of_month THEN
          v_next_date := DATE_TRUNC('month', v_candidate_date) + INTERVAL '1 month' - INTERVAL '1 day';
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- If date calculation fails, use last day of month
        v_next_date := DATE_TRUNC('month', v_candidate_date) + INTERVAL '1 month' - INTERVAL '1 day';
      END;
  END CASE;
  
  RETURN v_next_date;
END;
$$;


--
-- Name: get_user_company_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_company_id(_user_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT company_id
  FROM public.company_users
  WHERE user_id = _user_id
  LIMIT 1
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default 'checker' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'checker');
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: has_company_role(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_company_role(_user_id uuid, _role text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_users
    WHERE user_id = _user_id AND company_role = _role
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_subscription_active(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_subscription_active(company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    status = 'active' AND 
    (trial_ends_at IS NULL OR trial_ends_at > NOW() OR subscription_tier != 'free')
  FROM companies
  WHERE id = company_id;
$$;


--
-- Name: is_trial_valid(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_trial_valid(company_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    CASE 
      WHEN trial_ends_at IS NULL THEN false
      WHEN trial_ends_at > NOW() THEN true
      ELSE false
    END
  FROM companies
  WHERE id = company_id;
$$;


--
-- Name: log_activity(uuid, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_activity(p_user_id uuid, p_activity_type text, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (user_id, activity_type, description, metadata)
  VALUES (p_user_id, p_activity_type, p_description, p_metadata)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;


--
-- Name: log_audit_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_audit_activity() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM public.log_activity(
      NEW.user_id,
      'audit_created',
      'Created audit for ' || NEW.location,
      jsonb_build_object(
        'audit_id', NEW.id,
        'location', NEW.location,
        'status', NEW.status
      )
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only log if status changed to completed
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed') THEN
      PERFORM public.log_activity(
        NEW.user_id,
        'audit_completed',
        'Completed audit for ' || NEW.location,
        jsonb_build_object(
          'audit_id', NEW.id,
          'location', NEW.location,
          'overall_score', NEW.overall_score
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: log_equipment_status_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_equipment_status_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.equipment_status_history (
      equipment_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: log_notification_action(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_notification_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.notification_audit_logs (
      notification_id,
      action,
      performed_by,
      metadata,
      target_roles
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.scheduled_for IS NOT NULL AND NEW.scheduled_for > now() THEN 'scheduled'
        ELSE 'created'
      END,
      NEW.created_by,
      jsonb_build_object(
        'title', NEW.title,
        'type', NEW.type,
        'scheduled_for', NEW.scheduled_for
      ),
      NEW.target_roles
    );
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.notification_audit_logs (
      notification_id,
      action,
      performed_by,
      metadata,
      target_roles
    ) VALUES (
      OLD.id,
      'deleted',
      auth.uid(),
      jsonb_build_object('title', OLD.title),
      OLD.target_roles
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: set_short_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_short_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := generate_short_code();
    SELECT EXISTS(SELECT 1 FROM test_assignments WHERE short_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  NEW.short_code := new_code;
  RETURN NEW;
END;
$$;


--
-- Name: set_trial_period(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_trial_period() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Only set trial period when company is approved (status changed from pending to active)
  IF OLD.status = 'pending' AND NEW.status = 'active' AND NEW.trial_ends_at IS NULL THEN
    NEW.trial_ends_at := NOW() + INTERVAL '7 days';
    NEW.approved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_last_login(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_last_login() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


--
-- Name: update_overdue_interventions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_overdue_interventions() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.equipment_interventions
  SET status = 'overdue'
  WHERE status = 'scheduled'
    AND scheduled_for < now();
END;
$$;


SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    activity_type text NOT NULL,
    description text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_field_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_field_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_response_id uuid NOT NULL,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_type text,
    file_size integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: audit_field_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_field_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_response_id uuid NOT NULL,
    photo_url text NOT NULL,
    caption text,
    file_size integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: audit_field_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_field_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    field_id uuid NOT NULL,
    section_id uuid NOT NULL,
    response_value jsonb,
    observations text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: audit_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    name text NOT NULL,
    field_type text NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    options jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audit_fields_field_type_check CHECK ((field_type = ANY (ARRAY['rating'::text, 'yesno'::text, 'text'::text, 'number'::text, 'date'::text])))
);


--
-- Name: audit_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    photo_url text NOT NULL,
    caption text,
    file_size integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_revisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    revision_number integer NOT NULL,
    changes jsonb NOT NULL,
    change_summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_section_responses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_section_responses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    audit_id uuid NOT NULL,
    section_id uuid NOT NULL,
    follow_up_needed boolean DEFAULT false,
    follow_up_notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    template_type text NOT NULL,
    is_global boolean DEFAULT false NOT NULL,
    location text,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    location_id uuid,
    company_id uuid NOT NULL,
    CONSTRAINT audit_templates_template_type_check CHECK ((template_type = ANY (ARRAY['location'::text, 'staff'::text])))
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    subscription_tier text DEFAULT 'free'::text NOT NULL,
    trial_ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    approved_by uuid,
    industry_id uuid,
    CONSTRAINT companies_status_check CHECK ((status = ANY (ARRAY['active'::text, 'suspended'::text, 'inactive'::text]))),
    CONSTRAINT companies_subscription_tier_check CHECK ((subscription_tier = ANY (ARRAY['free'::text, 'starter'::text, 'professional'::text, 'enterprise'::text])))
);


--
-- Name: company_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    module_name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    activated_at timestamp with time zone DEFAULT now() NOT NULL,
    deactivated_at timestamp with time zone,
    CONSTRAINT company_modules_module_name_check CHECK ((module_name = ANY (ARRAY['location_audits'::text, 'staff_performance'::text, 'equipment_management'::text, 'notifications'::text, 'reports'::text])))
);


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    company_role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT company_users_company_role_check CHECK ((company_role = ANY (ARRAY['company_owner'::text, 'company_admin'::text, 'company_member'::text])))
);


--
-- Name: document_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    title text NOT NULL,
    description text,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid,
    renewal_date date,
    location_id uuid,
    document_type text DEFAULT 'knowledge'::text,
    notification_email text,
    CONSTRAINT documents_document_type_check CHECK ((document_type = ANY (ARRAY['knowledge'::text, 'permit'::text, 'contract'::text])))
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    company_id uuid NOT NULL
);


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    name text NOT NULL,
    model_type text,
    power_supply_type text,
    power_consumption text,
    date_added date DEFAULT CURRENT_DATE NOT NULL,
    last_check_date date,
    next_check_date date,
    last_check_notes text,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid NOT NULL,
    CONSTRAINT equipment_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: equipment_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_size integer,
    uploaded_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: equipment_interventions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_interventions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    location_id uuid NOT NULL,
    title text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    performed_at timestamp with time zone,
    performed_by_user_id uuid NOT NULL,
    supervised_by_user_id uuid,
    status text DEFAULT 'scheduled'::text NOT NULL,
    description text,
    before_photo_url text,
    after_photo_url text,
    notes text,
    next_check_date date,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid,
    CONSTRAINT equipment_interventions_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'overdue'::text])))
);


--
-- Name: equipment_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    old_status text,
    new_status text NOT NULL,
    changed_by uuid NOT NULL,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: industries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.industries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: location_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    location text NOT NULL,
    audit_date date NOT NULL,
    time_start time without time zone,
    time_end time without time zone,
    compliance_licenses integer,
    compliance_permits integer,
    compliance_signage integer,
    compliance_documentation integer,
    boh_storage integer,
    boh_temperature integer,
    boh_preparation integer,
    boh_equipment integer,
    cleaning_surfaces integer,
    cleaning_floors integer,
    cleaning_equipment integer,
    cleaning_waste integer,
    foh_customer_areas integer,
    foh_restrooms integer,
    foh_menu_boards integer,
    foh_seating integer,
    overall_score integer,
    status text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    template_id uuid,
    custom_data jsonb,
    location_id uuid,
    scheduled_start timestamp with time zone,
    scheduled_end timestamp with time zone,
    assigned_user_id uuid,
    company_id uuid,
    CONSTRAINT location_audits_boh_equipment_check CHECK (((boh_equipment >= 1) AND (boh_equipment <= 5))),
    CONSTRAINT location_audits_boh_preparation_check CHECK (((boh_preparation >= 1) AND (boh_preparation <= 5))),
    CONSTRAINT location_audits_boh_storage_check CHECK (((boh_storage >= 1) AND (boh_storage <= 5))),
    CONSTRAINT location_audits_boh_temperature_check CHECK (((boh_temperature >= 1) AND (boh_temperature <= 5))),
    CONSTRAINT location_audits_cleaning_equipment_check CHECK (((cleaning_equipment >= 1) AND (cleaning_equipment <= 5))),
    CONSTRAINT location_audits_cleaning_floors_check CHECK (((cleaning_floors >= 1) AND (cleaning_floors <= 5))),
    CONSTRAINT location_audits_cleaning_surfaces_check CHECK (((cleaning_surfaces >= 1) AND (cleaning_surfaces <= 5))),
    CONSTRAINT location_audits_cleaning_waste_check CHECK (((cleaning_waste >= 1) AND (cleaning_waste <= 5))),
    CONSTRAINT location_audits_compliance_documentation_check CHECK (((compliance_documentation >= 1) AND (compliance_documentation <= 5))),
    CONSTRAINT location_audits_compliance_licenses_check CHECK (((compliance_licenses >= 1) AND (compliance_licenses <= 5))),
    CONSTRAINT location_audits_compliance_permits_check CHECK (((compliance_permits >= 1) AND (compliance_permits <= 5))),
    CONSTRAINT location_audits_compliance_signage_check CHECK (((compliance_signage >= 1) AND (compliance_signage <= 5))),
    CONSTRAINT location_audits_foh_customer_areas_check CHECK (((foh_customer_areas >= 1) AND (foh_customer_areas <= 5))),
    CONSTRAINT location_audits_foh_menu_boards_check CHECK (((foh_menu_boards >= 1) AND (foh_menu_boards <= 5))),
    CONSTRAINT location_audits_foh_restrooms_check CHECK (((foh_restrooms >= 1) AND (foh_restrooms <= 5))),
    CONSTRAINT location_audits_foh_seating_check CHECK (((foh_seating >= 1) AND (foh_seating <= 5))),
    CONSTRAINT location_audits_status_check CHECK (((status IS NULL) OR (status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text, 'compliant'::text, 'non-compliant'::text]))))
);


--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text,
    city text,
    type text,
    manager_id uuid,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    company_id uuid NOT NULL,
    CONSTRAINT locations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])))
);


--
-- Name: manual_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.manual_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_date date NOT NULL,
    location_id uuid,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);


--
-- Name: module_industries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_industries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id uuid NOT NULL,
    industry_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    base_price numeric,
    industry_scope text NOT NULL,
    icon_name text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT modules_industry_scope_check CHECK ((industry_scope = ANY (ARRAY['GLOBAL'::text, 'INDUSTRY_SPECIFIC'::text])))
);


--
-- Name: notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_reads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    user_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL,
    snoozed_until timestamp with time zone
);

ALTER TABLE ONLY public.notification_reads REPLICA IDENTITY FULL;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    target_roles text[] DEFAULT '{checker,manager,admin}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    expires_at timestamp with time zone,
    scheduled_for timestamp with time zone,
    recurrence_pattern text DEFAULT 'none'::text NOT NULL,
    recurrence_enabled boolean DEFAULT false,
    last_sent_at timestamp with time zone,
    next_scheduled_at timestamp with time zone,
    audit_id uuid,
    updated_at timestamp with time zone DEFAULT now(),
    company_id uuid,
    CONSTRAINT notifications_recurrence_pattern_check CHECK ((recurrence_pattern = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notification_analytics; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.notification_analytics WITH (security_invoker='on') AS
 SELECT n.id,
    n.title,
    n.type,
    n.target_roles,
    n.created_at,
    n.recurrence_pattern,
    count(DISTINCT nr.user_id) AS read_count,
    ( SELECT count(DISTINCT ur.user_id) AS count
           FROM public.user_roles ur
          WHERE ((ur.role)::text = ANY (n.target_roles))) AS total_recipients,
        CASE
            WHEN (( SELECT count(DISTINCT ur.user_id) AS count
               FROM public.user_roles ur
              WHERE ((ur.role)::text = ANY (n.target_roles))) > 0) THEN round((((count(DISTINCT nr.user_id))::numeric / (( SELECT count(DISTINCT ur.user_id) AS count
               FROM public.user_roles ur
              WHERE ((ur.role)::text = ANY (n.target_roles))))::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS read_rate_percentage
   FROM (public.notifications n
     LEFT JOIN public.notification_reads nr ON ((n.id = nr.notification_id)))
  GROUP BY n.id, n.title, n.type, n.target_roles, n.created_at, n.recurrence_pattern;


--
-- Name: notification_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notification_id uuid NOT NULL,
    action text NOT NULL,
    performed_by uuid NOT NULL,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    recipients_count integer,
    target_roles text[]
);


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    target_roles text[] DEFAULT '{checker,manager,admin}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    company_id uuid
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login timestamp with time zone,
    avatar_url text
);


--
-- Name: recurring_audit_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_audit_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    location_id uuid NOT NULL,
    template_id uuid NOT NULL,
    assigned_user_id uuid NOT NULL,
    recurrence_pattern text NOT NULL,
    day_of_week integer,
    day_of_month integer,
    start_time time without time zone NOT NULL,
    duration_hours integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    start_date date NOT NULL,
    end_date date,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_generated_date date,
    CONSTRAINT recurring_audit_schedules_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31))),
    CONSTRAINT recurring_audit_schedules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT recurring_audit_schedules_recurrence_pattern_check CHECK ((recurrence_pattern = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text])))
);


--
-- Name: recurring_maintenance_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_maintenance_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid NOT NULL,
    location_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    recurrence_pattern text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    day_of_week integer,
    day_of_month integer,
    start_time time without time zone NOT NULL,
    assigned_user_id uuid NOT NULL,
    supervisor_user_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    last_generated_date date,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recurring_maintenance_schedules_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31))),
    CONSTRAINT recurring_maintenance_schedules_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT recurring_maintenance_schedules_recurrence_pattern_check CHECK ((recurrence_pattern = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text, 'quarterly'::text, 'yearly'::text])))
);


--
-- Name: staff_audits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_audits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    location_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    template_id uuid,
    auditor_id uuid NOT NULL,
    audit_date date DEFAULT CURRENT_DATE NOT NULL,
    score integer NOT NULL,
    notes text,
    custom_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid,
    CONSTRAINT staff_audits_score_check CHECK (((score >= 0) AND (score <= 100)))
);


--
-- Name: template_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_id uuid NOT NULL,
    location_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    short_code text
);


--
-- Name: test_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    question text NOT NULL,
    options jsonb NOT NULL,
    correct_answer text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: test_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    test_id uuid NOT NULL,
    staff_name text,
    staff_location text,
    answers jsonb NOT NULL,
    score integer,
    passed boolean,
    time_taken_minutes integer,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    employee_id uuid
);


--
-- Name: tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    document_id uuid,
    time_limit_minutes integer DEFAULT 30 NOT NULL,
    passing_score integer DEFAULT 70 NOT NULL,
    scheduled_for timestamp with time zone,
    expires_at timestamp with time zone,
    created_by uuid NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    company_id uuid
);


--
-- Name: upcoming_renewals; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.upcoming_renewals WITH (security_invoker='true') AS
 SELECT d.id,
    d.title,
    d.renewal_date,
    d.location_id,
    l.name AS location_name,
    dc.name AS category_name,
    d.document_type,
    d.file_url,
    d.company_id
   FROM ((public.documents d
     LEFT JOIN public.locations l ON ((d.location_id = l.id)))
     LEFT JOIN public.document_categories dc ON ((d.category_id = dc.id)))
  WHERE ((d.renewal_date IS NOT NULL) AND (d.renewal_date >= CURRENT_DATE))
  ORDER BY d.renewal_date;


--
-- Name: user_module_onboarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_module_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module_name text NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    steps_completed jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: audit_field_attachments audit_field_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_attachments
    ADD CONSTRAINT audit_field_attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_field_photos audit_field_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_photos
    ADD CONSTRAINT audit_field_photos_pkey PRIMARY KEY (id);


--
-- Name: audit_field_responses audit_field_responses_audit_id_field_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_responses
    ADD CONSTRAINT audit_field_responses_audit_id_field_id_key UNIQUE (audit_id, field_id);


--
-- Name: audit_field_responses audit_field_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_responses
    ADD CONSTRAINT audit_field_responses_pkey PRIMARY KEY (id);


--
-- Name: audit_fields audit_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_fields
    ADD CONSTRAINT audit_fields_pkey PRIMARY KEY (id);


--
-- Name: audit_photos audit_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_photos
    ADD CONSTRAINT audit_photos_pkey PRIMARY KEY (id);


--
-- Name: audit_revisions audit_revisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_revisions
    ADD CONSTRAINT audit_revisions_pkey PRIMARY KEY (id);


--
-- Name: audit_section_responses audit_section_responses_audit_id_section_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_section_responses
    ADD CONSTRAINT audit_section_responses_audit_id_section_id_key UNIQUE (audit_id, section_id);


--
-- Name: audit_section_responses audit_section_responses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_section_responses
    ADD CONSTRAINT audit_section_responses_pkey PRIMARY KEY (id);


--
-- Name: audit_sections audit_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sections
    ADD CONSTRAINT audit_sections_pkey PRIMARY KEY (id);


--
-- Name: audit_templates audit_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_templates
    ADD CONSTRAINT audit_templates_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: company_modules company_modules_company_id_module_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_company_id_module_name_key UNIQUE (company_id, module_name);


--
-- Name: company_modules company_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_company_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_company_id_user_id_key UNIQUE (company_id, user_id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: document_categories document_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: equipment_documents equipment_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_documents
    ADD CONSTRAINT equipment_documents_pkey PRIMARY KEY (id);


--
-- Name: equipment_interventions equipment_interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_interventions
    ADD CONSTRAINT equipment_interventions_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: equipment_status_history equipment_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_status_history
    ADD CONSTRAINT equipment_status_history_pkey PRIMARY KEY (id);


--
-- Name: industries industries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_pkey PRIMARY KEY (id);


--
-- Name: industries industries_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.industries
    ADD CONSTRAINT industries_slug_key UNIQUE (slug);


--
-- Name: location_audits location_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_audits
    ADD CONSTRAINT location_audits_pkey PRIMARY KEY (id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);


--
-- Name: manual_metrics manual_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_metrics
    ADD CONSTRAINT manual_metrics_pkey PRIMARY KEY (id);


--
-- Name: module_industries module_industries_module_id_industry_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_industries
    ADD CONSTRAINT module_industries_module_id_industry_id_key UNIQUE (module_id, industry_id);


--
-- Name: module_industries module_industries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_industries
    ADD CONSTRAINT module_industries_pkey PRIMARY KEY (id);


--
-- Name: modules modules_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_code_key UNIQUE (code);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: notification_audit_logs notification_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_audit_logs
    ADD CONSTRAINT notification_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: notification_reads notification_reads_notification_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_user_id_key UNIQUE (notification_id, user_id);


--
-- Name: notification_reads notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recurring_audit_schedules recurring_audit_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_audit_schedules
    ADD CONSTRAINT recurring_audit_schedules_pkey PRIMARY KEY (id);


--
-- Name: recurring_maintenance_schedules recurring_maintenance_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_maintenance_schedules
    ADD CONSTRAINT recurring_maintenance_schedules_pkey PRIMARY KEY (id);


--
-- Name: staff_audits staff_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audits
    ADD CONSTRAINT staff_audits_pkey PRIMARY KEY (id);


--
-- Name: template_locations template_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_locations
    ADD CONSTRAINT template_locations_pkey PRIMARY KEY (id);


--
-- Name: template_locations template_locations_template_id_location_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_locations
    ADD CONSTRAINT template_locations_template_id_location_id_key UNIQUE (template_id, location_id);


--
-- Name: test_assignments test_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_pkey PRIMARY KEY (id);


--
-- Name: test_assignments test_assignments_short_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_short_code_key UNIQUE (short_code);


--
-- Name: test_assignments test_assignments_test_id_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_test_id_employee_id_key UNIQUE (test_id, employee_id);


--
-- Name: test_questions test_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_questions
    ADD CONSTRAINT test_questions_pkey PRIMARY KEY (id);


--
-- Name: test_submissions test_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_submissions
    ADD CONSTRAINT test_submissions_pkey PRIMARY KEY (id);


--
-- Name: tests tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_pkey PRIMARY KEY (id);


--
-- Name: user_module_onboarding user_module_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_module_onboarding
    ADD CONSTRAINT user_module_onboarding_pkey PRIMARY KEY (id);


--
-- Name: user_module_onboarding user_module_onboarding_user_id_module_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_module_onboarding
    ADD CONSTRAINT user_module_onboarding_user_id_module_name_key UNIQUE (user_id, module_name);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_activity_logs_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_activity_type ON public.activity_logs USING btree (activity_type);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user_id ON public.activity_logs USING btree (user_id);


--
-- Name: idx_audit_field_attachments_response_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_field_attachments_response_id ON public.audit_field_attachments USING btree (field_response_id);


--
-- Name: idx_audit_field_photos_response_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_field_photos_response_id ON public.audit_field_photos USING btree (field_response_id);


--
-- Name: idx_audit_field_responses_audit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_field_responses_audit_id ON public.audit_field_responses USING btree (audit_id);


--
-- Name: idx_audit_field_responses_field_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_field_responses_field_id ON public.audit_field_responses USING btree (field_id);


--
-- Name: idx_audit_photos_audit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_photos_audit_id ON public.audit_photos USING btree (audit_id);


--
-- Name: idx_audit_photos_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_photos_user_id ON public.audit_photos USING btree (user_id);


--
-- Name: idx_audit_revisions_audit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_revisions_audit_id ON public.audit_revisions USING btree (audit_id);


--
-- Name: idx_audit_revisions_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_revisions_changed_at ON public.audit_revisions USING btree (changed_at DESC);


--
-- Name: idx_audit_revisions_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_revisions_changed_by ON public.audit_revisions USING btree (changed_by);


--
-- Name: idx_audit_section_responses_audit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_section_responses_audit_id ON public.audit_section_responses USING btree (audit_id);


--
-- Name: idx_audit_section_responses_section_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_section_responses_section_id ON public.audit_section_responses USING btree (section_id);


--
-- Name: idx_audit_templates_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_templates_location_id ON public.audit_templates USING btree (location_id);


--
-- Name: idx_companies_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_status ON public.companies USING btree (status);


--
-- Name: idx_companies_trial_ends_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_trial_ends_at ON public.companies USING btree (trial_ends_at);


--
-- Name: idx_company_users_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_users_company_id ON public.company_users USING btree (company_id);


--
-- Name: idx_company_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_users_user_id ON public.company_users USING btree (user_id);


--
-- Name: idx_documents_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_category_id ON public.documents USING btree (category_id);


--
-- Name: idx_documents_renewal_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_renewal_date ON public.documents USING btree (renewal_date) WHERE (renewal_date IS NOT NULL);


--
-- Name: idx_employees_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_company_id ON public.employees USING btree (company_id);


--
-- Name: idx_employees_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_location_id ON public.employees USING btree (location_id);


--
-- Name: idx_employees_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_employees_status ON public.employees USING btree (status);


--
-- Name: idx_equipment_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_company_id ON public.equipment USING btree (company_id);


--
-- Name: idx_equipment_status_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_status_history_changed_at ON public.equipment_status_history USING btree (changed_at DESC);


--
-- Name: idx_equipment_status_history_equipment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_equipment_status_history_equipment_id ON public.equipment_status_history USING btree (equipment_id);


--
-- Name: idx_location_audits_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_audits_assigned_user ON public.location_audits USING btree (assigned_user_id) WHERE (assigned_user_id IS NOT NULL);


--
-- Name: idx_location_audits_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_audits_company_id ON public.location_audits USING btree (company_id);


--
-- Name: idx_location_audits_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_audits_location_id ON public.location_audits USING btree (location_id);


--
-- Name: idx_location_audits_scheduled_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_audits_scheduled_start ON public.location_audits USING btree (scheduled_start) WHERE (scheduled_start IS NOT NULL);


--
-- Name: idx_locations_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_company_id ON public.locations USING btree (company_id);


--
-- Name: idx_locations_manager; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_manager ON public.locations USING btree (manager_id);


--
-- Name: idx_locations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_locations_status ON public.locations USING btree (status);


--
-- Name: idx_manual_metrics_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_metrics_date ON public.manual_metrics USING btree (metric_date DESC);


--
-- Name: idx_manual_metrics_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_metrics_location ON public.manual_metrics USING btree (location_id);


--
-- Name: idx_manual_metrics_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_manual_metrics_name ON public.manual_metrics USING btree (metric_name);


--
-- Name: idx_notification_audit_logs_notification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_audit_logs_notification ON public.notification_audit_logs USING btree (notification_id);


--
-- Name: idx_notification_audit_logs_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_audit_logs_performed_at ON public.notification_audit_logs USING btree (performed_at DESC);


--
-- Name: idx_notification_audit_logs_performed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_audit_logs_performed_by ON public.notification_audit_logs USING btree (performed_by);


--
-- Name: idx_notification_reads_notification; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_reads_notification ON public.notification_reads USING btree (notification_id);


--
-- Name: idx_notification_reads_snoozed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_reads_snoozed ON public.notification_reads USING btree (user_id, notification_id, snoozed_until) WHERE (snoozed_until IS NOT NULL);


--
-- Name: idx_notification_reads_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_reads_user ON public.notification_reads USING btree (user_id);


--
-- Name: idx_notification_templates_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_templates_created_by ON public.notification_templates USING btree (created_by);


--
-- Name: idx_notifications_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_active ON public.notifications USING btree (is_active, expires_at);


--
-- Name: idx_notifications_audit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_audit_id ON public.notifications USING btree (audit_id);


--
-- Name: idx_notifications_recurrence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_recurrence ON public.notifications USING btree (recurrence_enabled, next_scheduled_at) WHERE (recurrence_enabled = true);


--
-- Name: idx_notifications_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_scheduled ON public.notifications USING btree (scheduled_for) WHERE (scheduled_for IS NOT NULL);


--
-- Name: idx_notifications_target_roles; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_target_roles ON public.notifications USING gin (target_roles);


--
-- Name: idx_recurring_schedules_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_schedules_active ON public.recurring_audit_schedules USING btree (is_active);


--
-- Name: idx_recurring_schedules_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_schedules_location ON public.recurring_audit_schedules USING btree (location_id);


--
-- Name: idx_recurring_schedules_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recurring_schedules_next_run ON public.recurring_audit_schedules USING btree (last_generated_date, is_active);


--
-- Name: idx_staff_audits_audit_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audits_audit_date ON public.staff_audits USING btree (audit_date DESC);


--
-- Name: idx_staff_audits_company_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audits_company_id ON public.staff_audits USING btree (company_id);


--
-- Name: idx_staff_audits_employee_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audits_employee_id ON public.staff_audits USING btree (employee_id);


--
-- Name: idx_staff_audits_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audits_location_id ON public.staff_audits USING btree (location_id);


--
-- Name: idx_template_locations_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_locations_location_id ON public.template_locations USING btree (location_id);


--
-- Name: idx_template_locations_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_locations_template_id ON public.template_locations USING btree (template_id);


--
-- Name: idx_test_assignments_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_assignments_employee ON public.test_assignments USING btree (employee_id);


--
-- Name: idx_test_assignments_test; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_assignments_test ON public.test_assignments USING btree (test_id);


--
-- Name: idx_test_questions_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_questions_test_id ON public.test_questions USING btree (test_id);


--
-- Name: idx_test_submissions_employee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_submissions_employee ON public.test_submissions USING btree (employee_id);


--
-- Name: idx_test_submissions_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_submissions_test_id ON public.test_submissions USING btree (test_id);


--
-- Name: idx_tests_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tests_document_id ON public.tests USING btree (document_id);


--
-- Name: idx_tests_scheduled_for; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tests_scheduled_for ON public.tests USING btree (scheduled_for);


--
-- Name: idx_user_module_onboarding_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_module_onboarding_completed ON public.user_module_onboarding USING btree (user_id, completed);


--
-- Name: idx_user_module_onboarding_user_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_module_onboarding_user_module ON public.user_module_onboarding USING btree (user_id, module_name);


--
-- Name: equipment equipment_status_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER equipment_status_change_trigger AFTER UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.log_equipment_status_change();


--
-- Name: test_assignments generate_short_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_short_code_trigger BEFORE INSERT ON public.test_assignments FOR EACH ROW EXECUTE FUNCTION public.set_short_code();


--
-- Name: audit_field_responses handle_audit_field_responses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_audit_field_responses_updated_at BEFORE UPDATE ON public.audit_field_responses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: audit_photos handle_audit_photos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_audit_photos_updated_at BEFORE UPDATE ON public.audit_photos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: document_categories handle_document_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_document_categories_updated_at BEFORE UPDATE ON public.document_categories FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: documents handle_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: industries handle_industries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_industries_updated_at BEFORE UPDATE ON public.industries FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: modules handle_modules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_modules_updated_at BEFORE UPDATE ON public.modules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: tests handle_tests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_tests_updated_at BEFORE UPDATE ON public.tests FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: location_audits log_location_audit_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER log_location_audit_activity AFTER INSERT OR UPDATE ON public.location_audits FOR EACH ROW EXECUTE FUNCTION public.log_audit_activity();


--
-- Name: notifications notification_audit_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notification_audit_trigger AFTER INSERT OR DELETE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.log_notification_action();


--
-- Name: audit_fields set_audit_fields_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_audit_fields_updated_at BEFORE UPDATE ON public.audit_fields FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: audit_sections set_audit_sections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_audit_sections_updated_at BEFORE UPDATE ON public.audit_sections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: audit_templates set_audit_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_audit_templates_updated_at BEFORE UPDATE ON public.audit_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: companies set_company_trial_period; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_company_trial_period BEFORE INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_trial_period();


--
-- Name: location_audits set_location_audits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_location_audits_updated_at BEFORE UPDATE ON public.location_audits FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: locations set_locations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_locations_updated_at BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: profiles set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: companies update_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: equipment_interventions update_equipment_interventions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_equipment_interventions_updated_at BEFORE UPDATE ON public.equipment_interventions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: equipment update_equipment_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: manual_metrics update_manual_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_manual_metrics_updated_at BEFORE UPDATE ON public.manual_metrics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: notification_templates update_notification_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: recurring_maintenance_schedules update_recurring_maintenance_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recurring_maintenance_schedules_updated_at BEFORE UPDATE ON public.recurring_maintenance_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: recurring_audit_schedules update_recurring_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_recurring_schedules_updated_at BEFORE UPDATE ON public.recurring_audit_schedules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: staff_audits update_staff_audits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_audits_updated_at BEFORE UPDATE ON public.staff_audits FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: user_module_onboarding update_user_module_onboarding_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_module_onboarding_updated_at BEFORE UPDATE ON public.user_module_onboarding FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: audit_field_attachments audit_field_attachments_field_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_attachments
    ADD CONSTRAINT audit_field_attachments_field_response_id_fkey FOREIGN KEY (field_response_id) REFERENCES public.audit_field_responses(id) ON DELETE CASCADE;


--
-- Name: audit_field_photos audit_field_photos_field_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_photos
    ADD CONSTRAINT audit_field_photos_field_response_id_fkey FOREIGN KEY (field_response_id) REFERENCES public.audit_field_responses(id) ON DELETE CASCADE;


--
-- Name: audit_field_responses audit_field_responses_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_responses
    ADD CONSTRAINT audit_field_responses_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.location_audits(id) ON DELETE CASCADE;


--
-- Name: audit_field_responses audit_field_responses_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_responses
    ADD CONSTRAINT audit_field_responses_field_id_fkey FOREIGN KEY (field_id) REFERENCES public.audit_fields(id) ON DELETE CASCADE;


--
-- Name: audit_field_responses audit_field_responses_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_field_responses
    ADD CONSTRAINT audit_field_responses_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.audit_sections(id) ON DELETE CASCADE;


--
-- Name: audit_fields audit_fields_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_fields
    ADD CONSTRAINT audit_fields_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.audit_sections(id) ON DELETE CASCADE;


--
-- Name: audit_photos audit_photos_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_photos
    ADD CONSTRAINT audit_photos_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.location_audits(id) ON DELETE CASCADE;


--
-- Name: audit_revisions audit_revisions_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_revisions
    ADD CONSTRAINT audit_revisions_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.location_audits(id) ON DELETE CASCADE;


--
-- Name: audit_revisions audit_revisions_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_revisions
    ADD CONSTRAINT audit_revisions_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: audit_section_responses audit_section_responses_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_section_responses
    ADD CONSTRAINT audit_section_responses_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.location_audits(id) ON DELETE CASCADE;


--
-- Name: audit_section_responses audit_section_responses_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_section_responses
    ADD CONSTRAINT audit_section_responses_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.audit_sections(id) ON DELETE CASCADE;


--
-- Name: audit_sections audit_sections_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_sections
    ADD CONSTRAINT audit_sections_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.audit_templates(id) ON DELETE CASCADE;


--
-- Name: audit_templates audit_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_templates
    ADD CONSTRAINT audit_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: audit_templates audit_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_templates
    ADD CONSTRAINT audit_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: audit_templates audit_templates_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_templates
    ADD CONSTRAINT audit_templates_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: companies companies_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: companies companies_industry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id);


--
-- Name: company_modules company_modules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_modules
    ADD CONSTRAINT company_modules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_users company_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: document_categories document_categories_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_categories
    ADD CONSTRAINT document_categories_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: documents documents_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.document_categories(id) ON DELETE CASCADE;


--
-- Name: documents documents_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: documents documents_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: employees employees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: employees employees_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: employees employees_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: equipment equipment_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: equipment_documents equipment_documents_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_documents
    ADD CONSTRAINT equipment_documents_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: equipment_interventions equipment_interventions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_interventions
    ADD CONSTRAINT equipment_interventions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: equipment_interventions equipment_interventions_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_interventions
    ADD CONSTRAINT equipment_interventions_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: equipment_interventions equipment_interventions_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_interventions
    ADD CONSTRAINT equipment_interventions_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: equipment_interventions equipment_interventions_performed_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_interventions
    ADD CONSTRAINT equipment_interventions_performed_by_user_id_fkey FOREIGN KEY (performed_by_user_id) REFERENCES public.profiles(id);


--
-- Name: equipment_interventions equipment_interventions_supervised_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_interventions
    ADD CONSTRAINT equipment_interventions_supervised_by_user_id_fkey FOREIGN KEY (supervised_by_user_id) REFERENCES public.profiles(id);


--
-- Name: equipment equipment_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: equipment_status_history equipment_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_status_history
    ADD CONSTRAINT equipment_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id);


--
-- Name: equipment_status_history equipment_status_history_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment_status_history
    ADD CONSTRAINT equipment_status_history_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: location_audits location_audits_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_audits
    ADD CONSTRAINT location_audits_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(id);


--
-- Name: location_audits location_audits_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_audits
    ADD CONSTRAINT location_audits_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: location_audits location_audits_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_audits
    ADD CONSTRAINT location_audits_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;


--
-- Name: location_audits location_audits_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_audits
    ADD CONSTRAINT location_audits_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.audit_templates(id);


--
-- Name: location_audits location_audits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_audits
    ADD CONSTRAINT location_audits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: locations locations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: locations locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: locations locations_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: manual_metrics manual_metrics_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_metrics
    ADD CONSTRAINT manual_metrics_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: manual_metrics manual_metrics_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.manual_metrics
    ADD CONSTRAINT manual_metrics_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: module_industries module_industries_industry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_industries
    ADD CONSTRAINT module_industries_industry_id_fkey FOREIGN KEY (industry_id) REFERENCES public.industries(id) ON DELETE CASCADE;


--
-- Name: module_industries module_industries_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_industries
    ADD CONSTRAINT module_industries_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: notification_audit_logs notification_audit_logs_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_audit_logs
    ADD CONSTRAINT notification_audit_logs_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_audit_logs notification_audit_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_audit_logs
    ADD CONSTRAINT notification_audit_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id) ON DELETE CASCADE;


--
-- Name: notification_reads notification_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_reads
    ADD CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notification_templates notification_templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_audit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_audit_id_fkey FOREIGN KEY (audit_id) REFERENCES public.location_audits(id) ON DELETE SET NULL;


--
-- Name: notifications notifications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: recurring_audit_schedules recurring_audit_schedules_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_audit_schedules
    ADD CONSTRAINT recurring_audit_schedules_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: recurring_audit_schedules recurring_audit_schedules_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_audit_schedules
    ADD CONSTRAINT recurring_audit_schedules_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: recurring_audit_schedules recurring_audit_schedules_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_audit_schedules
    ADD CONSTRAINT recurring_audit_schedules_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: recurring_audit_schedules recurring_audit_schedules_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_audit_schedules
    ADD CONSTRAINT recurring_audit_schedules_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.audit_templates(id) ON DELETE CASCADE;


--
-- Name: recurring_maintenance_schedules recurring_maintenance_schedules_assigned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_maintenance_schedules
    ADD CONSTRAINT recurring_maintenance_schedules_assigned_user_id_fkey FOREIGN KEY (assigned_user_id) REFERENCES public.profiles(id);


--
-- Name: recurring_maintenance_schedules recurring_maintenance_schedules_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_maintenance_schedules
    ADD CONSTRAINT recurring_maintenance_schedules_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;


--
-- Name: recurring_maintenance_schedules recurring_maintenance_schedules_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_maintenance_schedules
    ADD CONSTRAINT recurring_maintenance_schedules_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: recurring_maintenance_schedules recurring_maintenance_schedules_supervisor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_maintenance_schedules
    ADD CONSTRAINT recurring_maintenance_schedules_supervisor_user_id_fkey FOREIGN KEY (supervisor_user_id) REFERENCES public.profiles(id);


--
-- Name: staff_audits staff_audits_auditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audits
    ADD CONSTRAINT staff_audits_auditor_id_fkey FOREIGN KEY (auditor_id) REFERENCES auth.users(id);


--
-- Name: staff_audits staff_audits_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audits
    ADD CONSTRAINT staff_audits_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: staff_audits staff_audits_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audits
    ADD CONSTRAINT staff_audits_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: staff_audits staff_audits_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audits
    ADD CONSTRAINT staff_audits_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: staff_audits staff_audits_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audits
    ADD CONSTRAINT staff_audits_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.audit_templates(id) ON DELETE SET NULL;


--
-- Name: template_locations template_locations_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_locations
    ADD CONSTRAINT template_locations_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE CASCADE;


--
-- Name: template_locations template_locations_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_locations
    ADD CONSTRAINT template_locations_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.audit_templates(id) ON DELETE CASCADE;


--
-- Name: test_assignments test_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES auth.users(id);


--
-- Name: test_assignments test_assignments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: test_assignments test_assignments_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_assignments
    ADD CONSTRAINT test_assignments_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: test_questions test_questions_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_questions
    ADD CONSTRAINT test_questions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: test_submissions test_submissions_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_submissions
    ADD CONSTRAINT test_submissions_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE SET NULL;


--
-- Name: test_submissions test_submissions_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_submissions
    ADD CONSTRAINT test_submissions_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.tests(id) ON DELETE CASCADE;


--
-- Name: tests tests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: tests tests_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tests
    ADD CONSTRAINT tests_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: user_module_onboarding user_module_onboarding_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_module_onboarding
    ADD CONSTRAINT user_module_onboarding_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: manual_metrics Admins and managers can create metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can create metrics" ON public.manual_metrics FOR INSERT WITH CHECK (((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)) AND (auth.uid() = created_by)));


--
-- Name: recurring_audit_schedules Admins and managers can create recurring schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can create recurring schedules" ON public.recurring_audit_schedules FOR INSERT WITH CHECK (((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)) AND (auth.uid() = created_by)));


--
-- Name: audit_field_attachments Admins and managers can delete attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete attachments" ON public.audit_field_attachments FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: locations Admins and managers can delete locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete locations" ON public.locations FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: audit_field_photos Admins and managers can delete photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete photos" ON public.audit_field_photos FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: audit_photos Admins and managers can delete photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can delete photos" ON public.audit_photos FOR DELETE USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: locations Admins and managers can insert locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can insert locations" ON public.locations FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: document_categories Admins and managers can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage categories" ON public.document_categories USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: documents Admins and managers can manage documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage documents" ON public.documents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: equipment_documents Admins and managers can manage documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage documents" ON public.equipment_documents USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: employees Admins and managers can manage employees in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage employees in their company" ON public.employees USING (((company_id = public.get_user_company_id(auth.uid())) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))));


--
-- Name: equipment Admins and managers can manage equipment in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage equipment in their company" ON public.equipment USING (((company_id = public.get_user_company_id(auth.uid())) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))));


--
-- Name: equipment_interventions Admins and managers can manage interventions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage interventions" ON public.equipment_interventions USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: locations Admins and managers can manage locations in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage locations in their company" ON public.locations USING (((company_id = public.get_user_company_id(auth.uid())) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))));


--
-- Name: test_questions Admins and managers can manage questions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage questions" ON public.test_questions USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: recurring_maintenance_schedules Admins and managers can manage recurring schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage recurring schedules" ON public.recurring_maintenance_schedules USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: template_locations Admins and managers can manage template locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage template locations" ON public.template_locations TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: test_assignments Admins and managers can manage test assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage test assignments" ON public.test_assignments TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: tests Admins and managers can manage tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can manage tests" ON public.tests USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: locations Admins and managers can update locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update locations" ON public.locations FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: manual_metrics Admins and managers can update metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update metrics" ON public.manual_metrics FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: recurring_audit_schedules Admins and managers can update recurring schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update recurring schedules" ON public.recurring_audit_schedules FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: audit_field_responses Admins and managers can update responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update responses" ON public.audit_field_responses FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: audit_section_responses Admins and managers can update section responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can update section responses" ON public.audit_section_responses FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: manual_metrics Admins and managers can view all metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view all metrics" ON public.manual_metrics FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: test_submissions Admins and managers can view all submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view all submissions" ON public.test_submissions FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: recurring_audit_schedules Admins and managers can view recurring schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view recurring schedules" ON public.recurring_audit_schedules FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: equipment_status_history Admins and managers can view status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and managers can view status history" ON public.equipment_status_history FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: notifications Admins can delete all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete all notifications" ON public.notifications FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: location_audits Admins can delete location audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete location audits" ON public.location_audits FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: manual_metrics Admins can delete metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete metrics" ON public.manual_metrics FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: recurring_audit_schedules Admins can delete recurring schedules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete recurring schedules" ON public.recurring_audit_schedules FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: staff_audits Admins can delete staff audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete staff audits" ON public.staff_audits FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can delete user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete user roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert user roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_templates Admins can manage all templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all templates" ON public.notification_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_fields Admins can manage fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage fields" ON public.audit_fields USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_sections Admins can manage sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sections" ON public.audit_sections USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: audit_templates Admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage templates" ON public.audit_templates USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: location_audits Admins can update all location audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all location audits" ON public.location_audits FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can update all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all notifications" ON public.notifications FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can update user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update user roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: activity_logs Admins can view all activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notification_audit_logs Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.notification_audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: notifications Admins can view all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: document_categories All authenticated users can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view categories" ON public.document_categories FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: documents All authenticated users can view documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view documents" ON public.documents FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: equipment_documents All authenticated users can view documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "All authenticated users can view documents" ON public.equipment_documents FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: test_submissions Anyone can create test submissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create test submissions" ON public.test_submissions FOR INSERT WITH CHECK (true);


--
-- Name: industries Anyone can view active industries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active industries" ON public.industries FOR SELECT USING ((is_active = true));


--
-- Name: modules Anyone can view active modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active modules" ON public.modules FOR SELECT USING ((is_active = true));


--
-- Name: test_assignments Anyone can view assignment by ID; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view assignment by ID" ON public.test_assignments FOR SELECT USING (true);


--
-- Name: equipment_documents Anyone can view equipment documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view equipment documents" ON public.equipment_documents FOR SELECT TO authenticated, anon USING (true);


--
-- Name: equipment_interventions Anyone can view equipment interventions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view equipment interventions" ON public.equipment_interventions FOR SELECT TO authenticated, anon USING (true);


--
-- Name: equipment_status_history Anyone can view equipment status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view equipment status history" ON public.equipment_status_history FOR SELECT TO authenticated, anon USING (true);


--
-- Name: module_industries Anyone can view module industry mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view module industry mappings" ON public.module_industries FOR SELECT USING (true);


--
-- Name: test_questions Anyone can view questions for active tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view questions for active tests" ON public.test_questions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tests
  WHERE ((tests.id = test_questions.test_id) AND (tests.is_active = true)))));


--
-- Name: location_audits Authenticated users can create location audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create location audits" ON public.location_audits FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: audit_revisions Authenticated users can create revisions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create revisions" ON public.audit_revisions FOR INSERT WITH CHECK ((auth.uid() = changed_by));


--
-- Name: staff_audits Authenticated users can create staff audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create staff audits" ON public.staff_audits FOR INSERT WITH CHECK ((auth.uid() = auditor_id));


--
-- Name: tests Authenticated users can view active tests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active tests" ON public.tests FOR SELECT USING ((is_active = true));


--
-- Name: user_roles Authenticated users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: equipment_status_history Checkers can view status history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Checkers can view status history" ON public.equipment_status_history FOR SELECT USING (public.has_role(auth.uid(), 'checker'::public.app_role));


--
-- Name: template_locations Checkers can view template locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Checkers can view template locations" ON public.template_locations FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'checker'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: audit_templates Checkers, managers and admins can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Checkers, managers and admins can view active templates" ON public.audit_templates FOR SELECT TO authenticated USING (((is_active = true) AND (public.has_role(auth.uid(), 'checker'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))));


--
-- Name: audit_fields Checkers, managers and admins can view fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Checkers, managers and admins can view fields" ON public.audit_fields FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.audit_sections s
     JOIN public.audit_templates t ON ((s.template_id = t.id)))
  WHERE ((s.id = audit_fields.section_id) AND (t.is_active = true) AND (public.has_role(auth.uid(), 'checker'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: audit_sections Checkers, managers and admins can view sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Checkers, managers and admins can view sections" ON public.audit_sections FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.audit_templates t
  WHERE ((t.id = audit_sections.template_id) AND (t.is_active = true) AND (public.has_role(auth.uid(), 'checker'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: company_users Company owners and admins can manage company users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners and admins can manage company users" ON public.company_users USING (((company_id = public.get_user_company_id(auth.uid())) AND (public.has_company_role(auth.uid(), 'company_owner'::text) OR public.has_company_role(auth.uid(), 'company_admin'::text)))) WITH CHECK (((company_id = public.get_user_company_id(auth.uid())) AND (public.has_company_role(auth.uid(), 'company_owner'::text) OR public.has_company_role(auth.uid(), 'company_admin'::text))));


--
-- Name: company_modules Company owners and admins can manage modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners and admins can manage modules" ON public.company_modules USING (((company_id = public.get_user_company_id(auth.uid())) AND (public.has_company_role(auth.uid(), 'company_owner'::text) OR public.has_company_role(auth.uid(), 'company_admin'::text))));


--
-- Name: user_roles Company owners and admins can manage user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners and admins can manage user roles" ON public.user_roles USING ((EXISTS ( SELECT 1
   FROM public.company_users cu1
  WHERE ((cu1.user_id = auth.uid()) AND ((cu1.company_role = 'company_owner'::text) OR (cu1.company_role = 'company_admin'::text)) AND (EXISTS ( SELECT 1
           FROM public.company_users cu2
          WHERE ((cu2.user_id = user_roles.user_id) AND (cu2.company_id = cu1.company_id)))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.company_users cu1
  WHERE ((cu1.user_id = auth.uid()) AND ((cu1.company_role = 'company_owner'::text) OR (cu1.company_role = 'company_admin'::text)) AND (EXISTS ( SELECT 1
           FROM public.company_users cu2
          WHERE ((cu2.user_id = user_roles.user_id) AND (cu2.company_id = cu1.company_id))))))));


--
-- Name: companies Company owners and admins can update their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Company owners and admins can update their company" ON public.companies FOR UPDATE USING (((id = public.get_user_company_id(auth.uid())) AND (public.has_company_role(auth.uid(), 'company_owner'::text) OR public.has_company_role(auth.uid(), 'company_admin'::text))));


--
-- Name: user_roles Managers can assign checker roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can assign checker roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((public.has_role(auth.uid(), 'manager'::public.app_role) AND (role = 'checker'::public.app_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notifications Managers can create notifications for checkers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can create notifications for checkers" ON public.notifications FOR INSERT WITH CHECK (((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)) AND (target_roles <@ ARRAY['checker'::text])));


--
-- Name: user_roles Managers can delete checker roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete checker roles" ON public.user_roles FOR DELETE TO authenticated USING (((public.has_role(auth.uid(), 'manager'::public.app_role) AND (role = 'checker'::public.app_role)) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: location_audits Managers can delete location audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete location audits" ON public.location_audits FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: audit_fields Managers can manage fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can manage fields" ON public.audit_fields TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: audit_sections Managers can manage sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can manage sections" ON public.audit_sections TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: audit_templates Managers can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can manage templates" ON public.audit_templates TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: location_audits Managers can update all location audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update all location audits" ON public.location_audits FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: staff_audits Managers can update all staff audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update all staff audits" ON public.staff_audits FOR UPDATE USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: profiles Managers can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view all profiles" ON public.profiles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notification_audit_logs Managers can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view audit logs" ON public.notification_audit_logs FOR SELECT USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: notification_templates Managers can view templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view templates" ON public.notification_templates FOR SELECT USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Managers can view user roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view user roles" ON public.user_roles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: industries Platform admins can manage industries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage industries" ON public.industries USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: module_industries Platform admins can manage module industry mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage module industry mappings" ON public.module_industries USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: modules Platform admins can manage modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage modules" ON public.modules USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: companies Platform admins can update all companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can update all companies" ON public.companies FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: companies Platform admins can view all companies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view all companies" ON public.companies FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: notification_audit_logs System can insert audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert audit logs" ON public.notification_audit_logs FOR INSERT WITH CHECK ((auth.uid() = performed_by));


--
-- Name: audit_field_attachments Users can add attachments to their responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add attachments to their responses" ON public.audit_field_attachments FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM (public.audit_field_responses afr
     JOIN public.location_audits la ON ((la.id = afr.audit_id)))
  WHERE ((afr.id = audit_field_attachments.field_response_id) AND (la.user_id = auth.uid()))))));


--
-- Name: audit_photos Users can add photos to their audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add photos to their audits" ON public.audit_photos FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_photos.audit_id) AND (location_audits.user_id = auth.uid()))))));


--
-- Name: audit_field_photos Users can add photos to their responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add photos to their responses" ON public.audit_field_photos FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM (public.audit_field_responses afr
     JOIN public.location_audits la ON ((la.id = afr.audit_id)))
  WHERE ((afr.id = audit_field_photos.field_response_id) AND (la.user_id = auth.uid()))))));


--
-- Name: audit_field_responses Users can create responses for their audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create responses for their audits" ON public.audit_field_responses FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_field_responses.audit_id) AND (location_audits.user_id = auth.uid()))))));


--
-- Name: audit_section_responses Users can create section responses for their audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create section responses for their audits" ON public.audit_section_responses FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_section_responses.audit_id) AND (location_audits.user_id = auth.uid()))))));


--
-- Name: user_module_onboarding Users can create their own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own onboarding" ON public.user_module_onboarding FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: audit_field_attachments Users can delete their own attachments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own attachments" ON public.audit_field_attachments FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: audit_field_photos Users can delete their own photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own photos" ON public.audit_field_photos FOR DELETE USING ((auth.uid() = created_by));


--
-- Name: audit_photos Users can delete their own photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own photos" ON public.audit_photos FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: notification_reads Users can mark notifications as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark notifications as read" ON public.notification_reads FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: equipment_interventions Users can update their assigned interventions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their assigned interventions" ON public.equipment_interventions FOR UPDATE USING (((auth.uid() = performed_by_user_id) OR (auth.uid() = supervised_by_user_id))) WITH CHECK (((auth.uid() = performed_by_user_id) OR (auth.uid() = supervised_by_user_id)));


--
-- Name: location_audits Users can update their own location audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own location audits" ON public.location_audits FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: notification_reads Users can update their own notification reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notification reads" ON public.notification_reads FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_module_onboarding Users can update their own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own onboarding" ON public.user_module_onboarding FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: audit_photos Users can update their own photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own photos" ON public.audit_photos FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: audit_field_responses Users can update their own responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own responses" ON public.audit_field_responses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_field_responses.audit_id) AND (location_audits.user_id = auth.uid())))));


--
-- Name: audit_section_responses Users can update their own section responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own section responses" ON public.audit_section_responses FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_section_responses.audit_id) AND (location_audits.user_id = auth.uid())))));


--
-- Name: staff_audits Users can update their own staff audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own staff audits" ON public.staff_audits FOR UPDATE USING ((auth.uid() = auditor_id));


--
-- Name: notifications Users can view active notifications for their role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active notifications for their role" ON public.notifications FOR SELECT USING (((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())) AND ((scheduled_for IS NULL) OR (scheduled_for <= now())) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND ((user_roles.role)::text = ANY (notifications.target_roles))))) AND (NOT (EXISTS ( SELECT 1
   FROM public.notification_reads
  WHERE ((notification_reads.notification_id = notifications.id) AND (notification_reads.user_id = auth.uid()) AND (notification_reads.snoozed_until IS NOT NULL) AND (notification_reads.snoozed_until > now())))))));


--
-- Name: audit_field_attachments Users can view attachments for accessible responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view attachments for accessible responses" ON public.audit_field_attachments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.audit_field_responses afr
     JOIN public.location_audits la ON ((la.id = afr.audit_id)))
  WHERE ((afr.id = audit_field_attachments.field_response_id) AND ((la.user_id = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: location_audits Users can view audits based on role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audits based on role" ON public.location_audits FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: staff_audits Users can view audits based on role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view audits based on role" ON public.staff_audits FOR SELECT USING (((auth.uid() = auditor_id) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: employees Users can view employees in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view employees in their company" ON public.employees FOR SELECT USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: equipment Users can view equipment in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view equipment in their company" ON public.equipment FOR SELECT USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: locations Users can view locations in their company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view locations in their company" ON public.locations FOR SELECT USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: audit_photos Users can view photos for accessible audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view photos for accessible audits" ON public.audit_photos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_photos.audit_id) AND ((location_audits.user_id = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: audit_field_photos Users can view photos for accessible responses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view photos for accessible responses" ON public.audit_field_photos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.audit_field_responses afr
     JOIN public.location_audits la ON ((la.id = afr.audit_id)))
  WHERE ((afr.id = audit_field_photos.field_response_id) AND ((la.user_id = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: audit_field_responses Users can view responses for accessible audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view responses for accessible audits" ON public.audit_field_responses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_field_responses.audit_id) AND ((location_audits.user_id = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: audit_revisions Users can view revisions for accessible audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view revisions for accessible audits" ON public.audit_revisions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_revisions.audit_id) AND ((location_audits.user_id = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: recurring_maintenance_schedules Users can view schedules for their assigned equipment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view schedules for their assigned equipment" ON public.recurring_maintenance_schedules FOR SELECT USING (((auth.uid() = assigned_user_id) OR (auth.uid() = supervisor_user_id) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: audit_section_responses Users can view section responses for accessible audits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view section responses for accessible audits" ON public.audit_section_responses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.location_audits
  WHERE ((location_audits.id = audit_section_responses.audit_id) AND ((location_audits.user_id = auth.uid()) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))))));


--
-- Name: test_submissions Users can view test submissions for accessible employees; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view test submissions for accessible employees" ON public.test_submissions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.employees e
  WHERE ((e.id = test_submissions.employee_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role))))) OR (auth.uid() IS NULL)));


--
-- Name: equipment_interventions Users can view their assigned interventions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their assigned interventions" ON public.equipment_interventions FOR SELECT USING (((auth.uid() = performed_by_user_id) OR (auth.uid() = supervised_by_user_id) OR public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: company_modules Users can view their company modules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their company modules" ON public.company_modules FOR SELECT USING ((company_id = public.get_user_company_id(auth.uid())));


--
-- Name: activity_logs Users can view their own activity logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own activity logs" ON public.activity_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: companies Users can view their own company; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own company" ON public.companies FOR SELECT USING ((id IN ( SELECT company_users.company_id
   FROM public.company_users
  WHERE (company_users.user_id = auth.uid()))));


--
-- Name: company_users Users can view their own company membership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own company membership" ON public.company_users FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: notification_reads Users can view their own notification reads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notification reads" ON public.notification_reads FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_module_onboarding Users can view their own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own onboarding" ON public.user_module_onboarding FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: activity_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_field_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_field_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_field_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_field_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_field_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_field_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_fields; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_fields ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_photos ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_revisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_revisions ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_section_responses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_section_responses ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: company_modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

--
-- Name: company_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;

--
-- Name: document_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: employees; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment_interventions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment_interventions ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.equipment_status_history ENABLE ROW LEVEL SECURITY;

--
-- Name: industries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;

--
-- Name: location_audits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.location_audits ENABLE ROW LEVEL SECURITY;

--
-- Name: locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

--
-- Name: manual_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.manual_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: module_industries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.module_industries ENABLE ROW LEVEL SECURITY;

--
-- Name: modules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_reads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

--
-- Name: notification_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_audit_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_audit_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: recurring_maintenance_schedules; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recurring_maintenance_schedules ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_audits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_audits ENABLE ROW LEVEL SECURITY;

--
-- Name: template_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: test_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: test_questions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

--
-- Name: test_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: tests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

--
-- Name: user_module_onboarding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_module_onboarding ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


