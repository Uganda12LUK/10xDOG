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

// Towns that share a discovery region. A user in any town of a region sees owners
// from the whole region on the map. Cities not listed here stand alone.
const CITY_REGIONS: string[][] = [["Rzeszów", "Tyczyn", "Chmielnik", "Borek Stary", "Kielanówka"]];

/**
 * Cities in the same region as `city` (including `city` itself). Falls back to
 * just `[city]` when the city belongs to no defined region.
 */
export function citiesNear(city: string): string[] {
  const region = CITY_REGIONS.find((r) => r.includes(city));
  return region ?? [city];
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
