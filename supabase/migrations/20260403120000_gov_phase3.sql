-- Government Operations Phase 3 Migration
-- Adds: boundary_geojson to gov_zones for polygon rendering on the map
-- Non-breaking: nullable column with null default

ALTER TABLE gov_zones
  ADD COLUMN IF NOT EXISTS boundary_geojson jsonb DEFAULT NULL;

COMMENT ON COLUMN gov_zones.boundary_geojson IS
  'GeoJSON polygon/multipolygon defining the zone boundary for map display. '
  'Format: { "type": "Polygon", "coordinates": [[[lon,lat],...]] }';
