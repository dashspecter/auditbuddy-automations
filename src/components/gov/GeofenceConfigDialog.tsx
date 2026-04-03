import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapContainer, TileLayer, Circle, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useUpdateLocation } from "@/hooks/useLocations";
import type { Location } from "@/hooks/useLocations";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Info } from "lucide-react";

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const schema = z.object({
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geofence_lat: z.string().optional(),
  geofence_lon: z.string().optional(),
  geofence_radius_meters: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/** Allows clicking on the map to set the geofence center */
function MapClickHandler({ onCoords }: { onCoords: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onCoords(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface Props {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeofenceConfigDialog({ location, open, onOpenChange }: Props) {
  const updateLocation = useUpdateLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      latitude: location.latitude?.toString() ?? "",
      longitude: location.longitude?.toString() ?? "",
      geofence_lat: location.geofence_lat?.toString() ?? "",
      geofence_lon: location.geofence_lon?.toString() ?? "",
      geofence_radius_meters: location.geofence_radius_meters?.toString() ?? "",
    },
  });

  const watchLat = form.watch("geofence_lat");
  const watchLon = form.watch("geofence_lon");
  const watchRadius = form.watch("geofence_radius_meters");

  const parsedLat = parseFloat(watchLat ?? "");
  const parsedLon = parseFloat(watchLon ?? "");
  const parsedRadius = parseInt(watchRadius ?? "");
  const hasCenter = !isNaN(parsedLat) && !isNaN(parsedLon);
  const hasRadius = !isNaN(parsedRadius) && parsedRadius > 0;

  const mapCenter: [number, number] = hasCenter
    ? [parsedLat, parsedLon]
    : location.latitude && location.longitude
      ? [location.latitude, location.longitude]
      : [0, 20];

  const onSubmit = async (values: FormValues) => {
    await updateLocation.mutateAsync({
      id: location.id,
      latitude: values.latitude ? parseFloat(values.latitude) : null,
      longitude: values.longitude ? parseFloat(values.longitude) : null,
      geofence_lat: values.geofence_lat ? parseFloat(values.geofence_lat) : null,
      geofence_lon: values.geofence_lon ? parseFloat(values.geofence_lon) : null,
      geofence_radius_meters: values.geofence_radius_meters ? parseInt(values.geofence_radius_meters) : null,
    } as any);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Geofence &amp; Location — {location.name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 bg-blue-50 text-blue-800 text-xs p-3 rounded-lg">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Click anywhere on the map to set the geofence center, or enter coordinates manually.
            The blue circle shows the check-in radius field workers must be within.
          </span>
        </div>

        {/* Mini map */}
        <div className="rounded-lg overflow-hidden border" style={{ height: 260 }}>
          <MapContainer center={mapCenter} zoom={hasCenter ? 15 : 5} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              onCoords={(lat, lon) => {
                form.setValue("geofence_lat", lat.toFixed(6));
                form.setValue("geofence_lon", lon.toFixed(6));
              }}
            />
            {hasCenter && (
              <Marker position={[parsedLat, parsedLon]} />
            )}
            {hasCenter && hasRadius && (
              <Circle
                center={[parsedLat, parsedLon]}
                radius={parsedRadius}
                pathOptions={{
                  color: "#3b82f6",
                  fillOpacity: 0.1,
                  dashArray: "6 4",
                }}
              />
            )}
          </MapContainer>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Location pin coords */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Location Pin (used for project map markers)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="latitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Latitude</FormLabel>
                    <FormControl><Input placeholder="e.g. -1.286389" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="longitude" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Longitude</FormLabel>
                    <FormControl><Input placeholder="e.g. 36.817223" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Geofence center */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Geofence Center (click map to set)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="geofence_lat" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Center Lat</FormLabel>
                    <FormControl><Input placeholder="e.g. -1.2864" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="geofence_lon" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Center Lon</FormLabel>
                    <FormControl><Input placeholder="e.g. 36.8172" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="geofence_radius_meters" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Radius (m)</FormLabel>
                    <FormControl><Input type="number" min="10" placeholder="e.g. 200" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Leave radius blank to disable geofencing for this location.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={updateLocation.isPending}>
                {updateLocation.isPending ? "Saving…" : "Save Geofence"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
