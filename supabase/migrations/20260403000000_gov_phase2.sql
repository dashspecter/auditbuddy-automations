-- Government Operations Phase 2 Migration
-- Adds: gov_site_checkins, gov_asset_reservations
-- Extends: locations (geofence_lat, geofence_lon)
-- All changes are non-breaking (new tables + nullable columns)

-- ─── gov_site_checkins ────────────────────────────────────────────────────────
-- Separate from attendance_logs to avoid polluting the general attendance system.
-- A worker can site-check-in multiple times per day across different projects.
CREATE TABLE gov_site_checkins (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid          NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id           uuid          NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  project_id            uuid          REFERENCES gov_projects(id) ON DELETE SET NULL,
  location_id           uuid          NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  work_order_id         uuid          REFERENCES cmms_work_orders(id) ON DELETE SET NULL,
  check_in_at           timestamptz   NOT NULL DEFAULT now(),
  check_out_at          timestamptz,
  checkin_lat           double precision,
  checkin_lon           double precision,
  checkout_lat          double precision,
  checkout_lon          double precision,
  -- null = geofence not configured for this location
  geofence_validated    boolean,
  geofence_distance_m   integer,
  notes                 text,
  created_at            timestamptz   NOT NULL DEFAULT now()
);

ALTER TABLE gov_site_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_site_checkins: company members"
  ON gov_site_checkins
  USING (company_id = get_user_company_id(auth.uid()));

CREATE INDEX ON gov_site_checkins(company_id);
CREATE INDEX ON gov_site_checkins(employee_id);
CREATE INDEX ON gov_site_checkins(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX ON gov_site_checkins(location_id);
CREATE INDEX ON gov_site_checkins(check_in_at DESC);

-- ─── gov_asset_reservations ──────────────────────────────────────────────────
-- Day-granular booking of assets/vehicles for projects.
-- Complements WO-based "in use" with forward-looking "reserved" visibility.
CREATE TABLE gov_asset_reservations (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id    uuid    NOT NULL REFERENCES cmms_assets(id) ON DELETE CASCADE,
  project_id  uuid    REFERENCES gov_projects(id) ON DELETE SET NULL,
  reserved_by uuid    NOT NULL REFERENCES auth.users(id),
  start_date  date    NOT NULL,
  end_date    date    NOT NULL,
  status      text    NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT end_after_start CHECK (end_date >= start_date)
);

ALTER TABLE gov_asset_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gov_asset_reservations: company members"
  ON gov_asset_reservations
  USING (company_id = get_user_company_id(auth.uid()));

CREATE INDEX ON gov_asset_reservations(company_id);
CREATE INDEX ON gov_asset_reservations(asset_id);
CREATE INDEX ON gov_asset_reservations(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX ON gov_asset_reservations(start_date, end_date);

CREATE TRIGGER gov_asset_reservations_updated_at
  BEFORE UPDATE ON gov_asset_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── locations: add geofence center coords (non-breaking, nullable) ───────────
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS geofence_lat double precision DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS geofence_lon double precision DEFAULT NULL;
