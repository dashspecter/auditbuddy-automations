import { useState, useMemo } from "react";
import { useGovZones, GovZone, useCreateGovZone, useUpdateGovZone, useDeleteGovZone, ZoneType } from "@/hooks/useGovZones";
import { useLocations } from "@/hooks/useLocations";
import type { Location } from "@/hooks/useLocations";
import { GeofenceConfigDialog } from "@/components/gov/GeofenceConfigDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, MapPin, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  region: "Region",
  district: "District",
  ward: "Ward",
  zone: "Zone",
  department: "Department",
};

interface ZoneFormState {
  name: string;
  code: string;
  description: string;
  zone_type: ZoneType;
  parent_zone_id: string;
}

const DEFAULT_FORM: ZoneFormState = {
  name: "",
  code: "",
  description: "",
  zone_type: "district",
  parent_zone_id: "",
};

function ZoneRow({ zone, depth, allZones, onEdit, onDelete }: {
  zone: GovZone;
  depth: number;
  allZones: GovZone[];
  onEdit: (z: GovZone) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const children = allZones.filter(z => z.parent_zone_id === zone.id);

  return (
    <>
      <div
        className="flex items-center gap-2 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <button onClick={() => setExpanded(e => !e)} className="shrink-0 w-4">
          {children.length > 0
            ? (expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)
            : <span />}
        </button>
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-sm flex-1">{zone.name}</span>
        {zone.code && <span className="text-xs text-muted-foreground font-mono">{zone.code}</span>}
        <Badge variant="outline" className="text-xs">{ZONE_TYPE_LABELS[zone.zone_type]}</Badge>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(zone)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(zone.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {expanded && children.map(child => (
        <ZoneRow key={child.id} zone={child} depth={depth + 1} allZones={allZones} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </>
  );
}

export default function Zones() {
  const { data: zones = [], isLoading } = useGovZones();
  const { data: locations = [] } = useLocations();
  const createZone = useCreateGovZone();
  const updateZone = useUpdateGovZone();
  const deleteZone = useDeleteGovZone();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<GovZone | null>(null);
  const [form, setForm] = useState<ZoneFormState>(DEFAULT_FORM);
  const [geofenceLocation, setGeofenceLocation] = useState<Location | null>(null);

  const rootZones = useMemo(() => zones.filter(z => !z.parent_zone_id), [zones]);

  const openCreate = () => {
    setEditingZone(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (zone: GovZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      code: zone.code ?? "",
      description: zone.description ?? "",
      zone_type: zone.zone_type,
      parent_zone_id: zone.parent_zone_id ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      description: form.description.trim() || undefined,
      zone_type: form.zone_type,
      parent_zone_id: form.parent_zone_id || undefined,
    };
    if (editingZone) {
      await updateZone.mutateAsync({ id: editingZone.id, ...payload });
    } else {
      await createZone.mutateAsync(payload as any);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const hasChildren = zones.some(z => z.parent_zone_id === id);
    if (hasChildren) { toast.error("Remove child zones first"); return; }
    await deleteZone.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Zones &amp; Districts</h1>
          <p className="text-muted-foreground mt-1">Organize your territory with geographic or departmental hierarchy</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Zone
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Zone Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading zones…</div>
          ) : zones.length === 0 ? (
            <div className="text-center py-10">
              <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No zones defined yet.</p>
              <Button className="mt-3" size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1.5" /> Create first zone
              </Button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {rootZones.map(zone => (
                <ZoneRow key={zone.id} zone={zone} depth={0} allZones={zones} onEdit={openEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingZone ? "Edit Zone" : "New Zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="e.g. District 4" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input placeholder="e.g. D4" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.zone_type} onValueChange={v => setForm(f => ({ ...f, zone_type: v as ZoneType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ZONE_TYPE_LABELS) as [ZoneType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {zones.filter(z => z.id !== editingZone?.id).length > 0 && (
              <div className="space-y-1.5">
                <Label>Parent Zone (optional)</Label>
                <Select value={form.parent_zone_id} onValueChange={v => setForm(f => ({ ...f, parent_zone_id: v === "none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (top-level)</SelectItem>
                    {zones.filter(z => z.id !== editingZone?.id).map(z => (
                      <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createZone.isPending || updateZone.isPending}>
              {editingZone ? "Save Changes" : "Create Zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Geofence configuration section */}
      {locations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-blue-500" />
              Location Geofences
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set GPS coordinates and check-in radius for each location. Used for field check-in validation and the operations map.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0.5">
              {locations.map(loc => {
                const hasGeofence = (loc as any).geofence_radius_meters != null;
                return (
                  <div
                    key={loc.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 group transition-colors"
                  >
                    <MapPin className={`h-3.5 w-3.5 shrink-0 ${hasGeofence ? "text-blue-500" : "text-muted-foreground"}`} />
                    <span className="flex-1 text-sm font-medium">{loc.name}</span>
                    {hasGeofence ? (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {(loc as any).geofence_radius_meters}m radius
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No geofence</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setGeofenceLocation(loc)}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
                      Configure
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geofence config dialog */}
      {geofenceLocation && (
        <GeofenceConfigDialog
          location={geofenceLocation}
          open={!!geofenceLocation}
          onOpenChange={open => { if (!open) setGeofenceLocation(null); }}
        />
      )}
    </div>
  );
}
