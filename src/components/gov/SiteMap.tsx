/**
 * Lightweight read-only map card for the staff field portal.
 * Shows the check-in site location pin + geofence circle.
 * Kept separate from GovMap to avoid pulling the full manager map into the staff bundle.
 */
import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface Props {
  /** Site center coordinates */
  lat: number;
  lon: number;
  locationName: string;
  /** Optional geofence circle */
  geofenceLat?: number | null;
  geofenceLon?: number | null;
  geofenceRadiusM?: number | null;
  /** Worker's current GPS position (if available) */
  workerLat?: number | null;
  workerLon?: number | null;
}

const workerIcon = L.divIcon({
  html: `<div style="
    width: 16px; height: 16px; border-radius: 50%;
    background: #3b82f6; border: 3px solid white;
    box-shadow: 0 0 0 2px #3b82f6;
  "></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export function SiteMap({
  lat, lon, locationName,
  geofenceLat, geofenceLon, geofenceRadiusM,
  workerLat, workerLon,
}: Props) {
  const center: [number, number] = [lat, lon];
  const fenceLat = geofenceLat ?? lat;
  const fenceLon = geofenceLon ?? lon;

  return (
    <div className="rounded-xl overflow-hidden border" style={{ height: 200 }}>
      <MapContainer center={center} zoom={15} className="h-full w-full" zoomControl={false} dragging={false} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Site marker */}
        <Marker position={center}>
          <Popup>{locationName}</Popup>
        </Marker>

        {/* Geofence circle */}
        {geofenceRadiusM && geofenceRadiusM > 0 && (
          <Circle
            center={[fenceLat, fenceLon]}
            radius={geofenceRadiusM}
            pathOptions={{
              color: "#3b82f6",
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: "6 4",
            }}
          />
        )}

        {/* Worker dot */}
        {workerLat != null && workerLon != null && (
          <Marker position={[workerLat, workerLon]} icon={workerIcon}>
            <Popup>Your location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
