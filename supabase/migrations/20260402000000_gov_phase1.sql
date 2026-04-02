-- Government Operations Phase 1 Migration
-- Creates: gov_zones, gov_projects, gov_project_milestones
-- Extends: cmms_work_orders (project_id), locations (zone_id, geofence_radius_meters)
-- All changes are non-breaking (nullable columns, new tables)

-- ─── gov_zones ─────────────────────────────────────────────────────────────────
CREATE TABLE gov_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  parent_zone_id uuid REFERENCES gov_zones(id) ON DELETE SET NULL,
  zone_type text NOT NULL DEFAULT 'district'
    CHECK (zone_type IN ('region', 'district', 'ward', 'zone', 'department')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gov_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_zones: company members" ON gov_zones
  USING (company_id = get_user_company_id(auth.uid()));

CREATE INDEX ON gov_zones(company_id);
CREATE INDEX ON gov_zones(parent_zone_id) WHERE parent_zone_id IS NOT NULL;

-- ─── gov_projects ───────────────────────────────────────────────────────────────
CREATE TABLE gov_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES gov_zones(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  project_number text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'on_hold', 'completed', 'cancelled')),
  priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  project_type text NOT NULL DEFAULT 'maintenance'
    CHECK (project_type IN (
      'infrastructure', 'maintenance', 'sanitation',
      'parks', 'construction', 'inspection', 'emergency'
    )),
  start_date date,
  end_date date,
  budget numeric,
  actual_cost numeric NOT NULL DEFAULT 0,
  project_manager_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_archived boolean NOT NULL DEFAULT false
);

ALTER TABLE gov_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_projects: company members" ON gov_projects
  USING (company_id = get_user_company_id(auth.uid()));

CREATE INDEX ON gov_projects(company_id);
CREATE INDEX ON gov_projects(status) WHERE NOT is_archived;
CREATE INDEX ON gov_projects(zone_id) WHERE zone_id IS NOT NULL;

-- Auto-generate project_number on insert
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_num int;
BEGIN
  SELECT COUNT(*) + 1 INTO seq_num
  FROM gov_projects
  WHERE company_id = NEW.company_id;

  NEW.project_number := 'PRJ-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_num::text, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER gov_projects_project_number
  BEFORE INSERT ON gov_projects
  FOR EACH ROW
  WHEN (NEW.project_number IS NULL)
  EXECUTE FUNCTION generate_project_number();

-- updated_at trigger
CREATE TRIGGER gov_projects_updated_at
  BEFORE UPDATE ON gov_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER gov_zones_updated_at
  BEFORE UPDATE ON gov_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── gov_project_milestones ────────────────────────────────────────────────────
CREATE TABLE gov_project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES gov_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'missed')),
  completed_at timestamptz,
  evidence_packet_id uuid REFERENCES evidence_packets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gov_project_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_project_milestones: company members" ON gov_project_milestones
  USING (company_id = get_user_company_id(auth.uid()));

CREATE INDEX ON gov_project_milestones(project_id);
CREATE INDEX ON gov_project_milestones(company_id);

-- ─── Extend cmms_work_orders (non-breaking nullable FK) ───────────────────────
ALTER TABLE cmms_work_orders
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES gov_projects(id) ON DELETE SET NULL;

CREATE INDEX ON cmms_work_orders(project_id) WHERE project_id IS NOT NULL;

-- ─── Extend locations (non-breaking nullable columns) ─────────────────────────
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES gov_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters integer DEFAULT NULL;

CREATE INDEX ON locations(zone_id) WHERE zone_id IS NOT NULL;
