// Shared city geography. Single source of truth for both the map (pin placement)
// and the owner-discovery query (region filter), so the two always agree on where
// a city sits and which towns count as "near" it. Pure data — safe to import on
// the server (no React/Leaflet dependencies).

export const CITY_CENTERS: Record<string, [number, number]> = {
  Warszawa: [52.2297, 21.0122],
  Kraków: [50.0647, 19.945],
  Wrocław: [51.1079, 17.0385],
  Poznań: [52.4064, 16.9252],
  Gdańsk: [54.352, 18.6466],
  Łódź: [51.7592, 19.456],
  Katowice: [50.2649, 19.0238],
  Lublin: [51.2465, 22.5684],
  Białystok: [53.1325, 23.1688],
  Szczecin: [53.4285, 14.5528],
  Rzeszów: [50.0413, 21.999],
  // Rzeszów area (satellite towns)
  Tyczyn: [49.9686, 22.0286],
  Chmielnik: [49.9939, 22.1089],
  "Borek Stary": [49.9497, 22.0286],
  Kielanówka: [50.028, 21.933],
};

// Radius (km) of the server-side discovery scope: the map only receives owners
// within this distance of the viewer. A generous superset of the client's
// distance filter (which tops out at 50 km) so the finer filter never asks for
// an owner the server already pruned. Comfortably spans the Rzeszów
// agglomeration while excluding other cities (Kraków/Lublin are 150 km+ away).
export const DISCOVERY_RADIUS_KM = 75;

// Fold case and diacritics so "Rzeszow" and "Rzeszów" resolve to the same key.
function normalizeCity(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Center of a known city, matched case- and diacritics-insensitively (keys in
 * CITY_CENTERS carry diacritics; user-entered city strings often don't). Returns
 * null for an empty/unknown city — the single geography lookup shared by the
 * profile pin and discovery.
 */
export function cityCenter(name: string | null): [number, number] | null {
  if (!name || name.trim().length === 0) return null;
  const q = normalizeCity(name);
  const key = Object.keys(CITY_CENTERS).find((k) => normalizeCity(k) === q);
  return key ? CITY_CENTERS[key] : null;
}

/**
 * Where a profile sits for discovery: its saved map pin when set, otherwise the
 * center of its (known) city, otherwise null when neither is available.
 */
export function discoveryPosition(profile: {
  locationLat: number | null;
  locationLng: number | null;
  city: string | null;
}): [number, number] | null {
  if (profile.locationLat != null && profile.locationLng != null) {
    return [profile.locationLat, profile.locationLng];
  }
  return cityCenter(profile.city);
}

/**
 * Whether an owner falls inside the viewer's discovery scope. An owner with no
 * resolvable position is dropped once the viewer has an anchor; when the viewer
 * has no anchor at all (unknown city, no pin) we can't scope by distance, so we
 * fall back to showing everyone rather than an empty map.
 */
export function withinDiscoveryRadius(
  anchor: [number, number] | null,
  owner: [number, number] | null,
  radiusKm: number = DISCOVERY_RADIUS_KM,
): boolean {
  if (anchor === null) return true;
  if (owner === null) return false;
  return distanceKm(anchor, owner) <= radiusKm;
}

/**
 * Approximate great-circle distance in kilometers between two [lat, lng] points
 * (haversine). Used by the map filter for an approximate "within N km" check between
 * city centers — not GPS-accurate, but good enough for town-level discovery.
 */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
