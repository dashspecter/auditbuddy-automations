/**
 * Haversine formula — returns great-circle distance in metres between two
 * lat/lon points. Accurate enough for site-check-in validation at field scale.
 */
export function haversineDistanceM(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Wraps navigator.geolocation.getCurrentPosition in a Promise.
 * Rejects after timeoutMs (default 10s) if the device doesn't respond.
 * Caller should handle GeolocationPositionError for denied permission.
 */
export function getCurrentPositionAsync(
  timeoutMs = 10_000
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this device'));
      return;
    }
    const timer = setTimeout(
      () => reject(new Error('Geolocation timed out')),
      timeoutMs
    );
    navigator.geolocation.getCurrentPosition(
      (pos) => { clearTimeout(timer); resolve(pos); },
      (err) => { clearTimeout(timer); reject(err); },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 }
    );
  });
}
