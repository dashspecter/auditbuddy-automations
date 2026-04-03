import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useGovProjects, GovProject } from "@/hooks/useGovProjects";
import { useGovZones } from "@/hooks/useGovZones";
import { useLocations } from "@/hooks/useLocations";
import { useGovSiteCheckinsByProject } from "@/hooks/useGovSiteCheckins";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, X, ExternalLink, Calendar, User,
  Layers, Eye, EyeOff, FolderOpen,
} from "lucide-react";
import { format, isPast } from "date-fns";

// ─── Fix default Leaflet marker icons (broken by Vite/webpack asset pipeline) ──
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Colored SVG markers ──────────────────────────────────────────────────────
function svgMarker(color: string, size = 28): L.DivIcon {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.4}" viewBox="0 0 28 39.2">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.8 14 25.2 14 25.2S28 23.8 28 14C28 6.27 21.73 0 14 0z"
        fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size * 1.4],
    iconAnchor: [size / 2, size * 1.4],
    popupAnchor: [0, -(size * 1.4)],
  });
}

const PROJECT_MARKER_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  active: "#3b82f6",
  on_hold: "#f59e0b",
  completed: "#22c55e",
  cancelled: "#ef4444",
};

const PRIORITY_MARKER_COLORS: Record<string, string> = {
  low: "#94a3b8",
  medium: "#3b82f6",
  high: "#f97316",
  critical: "#ef4444",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  active: "bg-blue-100 text-blue-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const ZONE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#22c55e",
  "#06b6d4", "#eab308", "#ef4444", "#6366f1",
];

// ─── Auto-fit map to markers ──────────────────────────────────────────────────
function MapFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] });
  }, [positions.length]);
  return null;
}

// ─── Layer toggle pill ────────────────────────────────────────────────────────
function LayerToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary/50"
      }`}
    >
      {active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      {label}
    </button>
  );
}

// ─── Project detail panel ─────────────────────────────────────────────────────
function ProjectPanel({ project, onClose }: { project: GovProject; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: checkins = [] } = useGovSiteCheckinsByProject(project.id);
  const isOverdue =
    project.end_date &&
    isPast(new Date(project.end_date)) &&
    project.status !== "completed" &&
    project.status !== "cancelled";

  return (
    <Card className="absolute top-4 right-4 z-[1000] w-80 shadow-xl">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {project.project_number && (
                <span className="text-xs font-mono text-muted-foreground">{project.project_number}</span>
              )}
              <Badge className={`text-xs ${STATUS_COLORS[project.status]}`} variant="secondary">
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            <h3 className="font-semibold mt-1 leading-tight">{project.title}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        <div className="space-y-1.5 text-xs text-muted-foreground">
          {project.zone && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> {project.zone.name}
            </div>
          )}
          {project.project_manager && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" /> {project.project_manager.full_name}
            </div>
          )}
          {project.end_date && (
            <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-500 font-medium" : ""}`}>
              <Calendar className="h-3.5 w-3.5" />
              {isOverdue ? "Overdue · " : "Due "}
              {format(new Date(project.end_date), "MMM d, yyyy")}
            </div>
          )}
          {checkins.length > 0 && (
            <div className="flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              {checkins.filter(c => !c.check_out_at).length} on site now · {checkins.length} total check-ins
            </div>
          )}
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={() => navigate(`/gov/projects/${project.id}`)}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open Project
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main map page ─────────────────────────────────────────────────────────────
export default function GovMap() {
  const { data: projects = [], isLoading: projectsLoading } = useGovProjects();
  const { data: zones = [] } = useGovZones();
  const { data: locations = [] } = useLocations();

  const [selectedProject, setSelectedProject] = useState<GovProject | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [showZones, setShowZones] = useState(true);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showCheckins, setShowCheckins] = useState(true);
  const [colorBy, setColorBy] = useState<"status" | "priority">("status");

  // Build a lookup from location id → location object (with lat/lon)
  const locationById = useMemo(() => {
    const map: Record<string, typeof locations[0]> = {};
    for (const l of locations) map[l.id] = l;
    return map;
  }, [locations]);

  // Projects that have a resolvable lat/lon (via location_id)
  const mappableProjects = useMemo(() => {
    return projects.filter(p => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!p.location_id) return false;
      const loc = locationById[p.location_id];
      return loc?.latitude != null && loc?.longitude != null;
    });
  }, [projects, statusFilter, locationById]);

  // Locations with a geofence configured
  const geofencedLocations = useMemo(() => {
    return locations.filter(l =>
      l.geofence_radius_meters != null &&
      l.geofence_lat != null &&
      l.geofence_lon != null
    );
  }, [locations]);

  // Zones with boundary GeoJSON
  const zonesWithBoundary = useMemo(() =>
    zones.filter(z => z.boundary_geojson != null), [zones]);

  // All lat/lon positions for fitBounds
  const allPositions = useMemo<[number, number][]>(() => {
    return mappableProjects
      .map(p => {
        const loc = locationById[p.location_id!];
        return loc ? [loc.latitude!, loc.longitude!] as [number, number] : null;
      })
      .filter(Boolean) as [number, number][];
  }, [mappableProjects, locationById]);

  const defaultCenter: [number, number] = allPositions.length > 0 ? allPositions[0] : [0, 20];

  // Zone color assignment (stable per zone index)
  const zoneColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    zones.forEach((z, i) => { map[z.id] = ZONE_COLORS[i % ZONE_COLORS.length]; });
    return map;
  }, [zones]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Operations Map</h1>
          <p className="text-muted-foreground mt-1">Projects, zones, and active field workers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          {/* Color by */}
          <Select value={colorBy} onValueChange={v => setColorBy(v as any)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Colour by status</SelectItem>
              <SelectItem value="priority">Colour by priority</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <LayerToggle label="Zone boundaries" active={showZones} onToggle={() => setShowZones(v => !v)} />
        <LayerToggle label="Geofences" active={showGeofences} onToggle={() => setShowGeofences(v => !v)} />
        <LayerToggle label="Check-in pins" active={showCheckins} onToggle={() => setShowCheckins(v => !v)} />
      </div>

      {/* Map container — relative so the detail panel can be absolutely positioned */}
      <div className="relative rounded-xl overflow-hidden border shadow-sm" style={{ height: "calc(100vh - 260px)", minHeight: 480 }}>
        {projectsLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
            <p className="text-sm text-muted-foreground">Loading map data…</p>
          </div>
        ) : (
          <MapContainer
            center={defaultCenter}
            zoom={allPositions.length === 0 ? 4 : 10}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Auto-fit on load */}
            <MapFitBounds positions={allPositions} />

            {/* Zone boundary polygons */}
            {showZones && zonesWithBoundary.map(zone => (
              <GeoJSON
                key={zone.id}
                data={zone.boundary_geojson}
                style={{
                  color: zoneColorMap[zone.id],
                  weight: 2,
                  opacity: 0.8,
                  fillOpacity: 0.08,
                }}
              >
                <Popup>
                  <strong>{zone.name}</strong>
                  {zone.code && <span className="ml-1 text-gray-500">({zone.code})</span>}
                  <br />
                  <span className="text-xs text-gray-500 capitalize">{zone.zone_type}</span>
                </Popup>
              </GeoJSON>
            ))}

            {/* Geofence circles */}
            {showGeofences && geofencedLocations.map(loc => (
              <Circle
                key={`fence-${loc.id}`}
                center={[loc.geofence_lat!, loc.geofence_lon!]}
                radius={loc.geofence_radius_meters!}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 1.5,
                  opacity: 0.6,
                  fillOpacity: 0.06,
                  dashArray: "6 4",
                }}
              >
                <Popup>
                  <strong>{loc.name}</strong><br />
                  <span className="text-xs text-gray-500">
                    Geofence: {loc.geofence_radius_meters}m radius
                  </span>
                </Popup>
              </Circle>
            ))}

            {/* Project markers */}
            {mappableProjects.map(project => {
              const loc = locationById[project.location_id!];
              if (!loc?.latitude || !loc?.longitude) return null;
              const color = colorBy === "status"
                ? PROJECT_MARKER_COLORS[project.status] ?? "#3b82f6"
                : PRIORITY_MARKER_COLORS[project.priority] ?? "#3b82f6";
              return (
                <Marker
                  key={project.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={svgMarker(color)}
                  eventHandlers={{
                    click: () => setSelectedProject(project),
                  }}
                >
                  <Popup>
                    <strong>{project.title}</strong><br />
                    {project.project_number && (
                      <span className="text-xs text-gray-500">{project.project_number}<br /></span>
                    )}
                    <span className="text-xs capitalize">{project.status.replace("_", " ")}</span>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* Selected project detail panel */}
        {selectedProject && (
          <ProjectPanel
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}

        {/* Empty state overlay */}
        {!projectsLoading && mappableProjects.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 z-10 gap-3">
            <MapPin className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              No projects with location coordinates found.
              <br />
              Set a <strong>Primary Location</strong> on your projects and ensure that location has
              <strong> lat/lon</strong> configured.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm rounded-lg border shadow p-2.5 text-xs space-y-1.5">
          <p className="font-semibold text-[10px] uppercase tracking-wider text-muted-foreground">
            {colorBy === "status" ? "Status" : "Priority"}
          </p>
          {colorBy === "status" ? (
            Object.entries(PROJECT_MARKER_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="capitalize">{status.replace("_", " ")}</span>
              </div>
            ))
          ) : (
            Object.entries(PRIORITY_MARKER_COLORS).map(([priority, color]) => (
              <div key={priority} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="capitalize">{priority}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
