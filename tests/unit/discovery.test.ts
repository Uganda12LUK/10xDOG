import { describe, expect, it } from "vitest";
import { cityCenter, discoveryPosition, withinDiscoveryRadius, DISCOVERY_RADIUS_KM } from "@/lib/geo";

// Regression for the "empty map" bug: discovery used to key on an exact city
// string looked up in a hand-maintained region dictionary. A real owner living
// in "Kielnarowa" (a Rzeszów-area village absent from the dictionary) matched
// nobody and saw an empty map, even though her saved pin sits ~3 km from owners
// in Tyczyn / Borek Stary / Chmielnik. Discovery is now position-based, so an
// off-dictionary town still finds its neighbours.

// Synthetic off-dictionary pin standing in for a Rzeszów-area village absent from
// CITY_CENTERS (no real user coordinates). Placed ~3 km from the Tyczyn center so
// the regression below still exercises the "near neighbour" path.
const KIELNAROWA_PIN: [number, number] = [49.99, 22.05];
const TYCZYN_CENTER: [number, number] = [49.9686, 22.0286]; // CITY_CENTERS.Tyczyn, ~3 km away
const WARSZAWA_CENTER: [number, number] = [52.2297, 21.0122]; // CITY_CENTERS.Warszawa, ~250 km away

describe("cityCenter", () => {
  it("resolves a known city regardless of case or diacritics", () => {
    expect(cityCenter("Rzeszów")).toEqual([50.0413, 21.999]);
    expect(cityCenter("rzeszów")).toEqual([50.0413, 21.999]);
    // "Rzeszow" without the ogonek is a common data-entry variant.
    expect(cityCenter("Rzeszow")).toEqual([50.0413, 21.999]);
  });

  it("returns null for a town absent from the dictionary", () => {
    expect(cityCenter("Kielnarowa")).toBeNull();
    expect(cityCenter("")).toBeNull();
    expect(cityCenter(null)).toBeNull();
  });
});

describe("discoveryPosition", () => {
  it("prefers the saved pin over the city center", () => {
    expect(
      discoveryPosition({ locationLat: KIELNAROWA_PIN[0], locationLng: KIELNAROWA_PIN[1], city: "Kielnarowa" }),
    ).toEqual(KIELNAROWA_PIN);
  });

  it("falls back to the city center when no pin is saved", () => {
    expect(discoveryPosition({ locationLat: null, locationLng: null, city: "Tyczyn" })).toEqual(TYCZYN_CENTER);
  });

  it("returns null when neither a pin nor a known city is available", () => {
    expect(discoveryPosition({ locationLat: null, locationLng: null, city: "Kielnarowa" })).toBeNull();
    expect(discoveryPosition({ locationLat: null, locationLng: null, city: null })).toBeNull();
  });
});

describe("withinDiscoveryRadius", () => {
  it("keeps an owner whose town center is within range of an off-dictionary pin", () => {
    // The core regression: Kielnarowa resident ↔ Tyczyn owner.
    expect(withinDiscoveryRadius(KIELNAROWA_PIN, TYCZYN_CENTER)).toBe(true);
  });

  it("drops an owner in a far-away city", () => {
    expect(withinDiscoveryRadius(KIELNAROWA_PIN, WARSZAWA_CENTER)).toBe(false);
  });

  it("drops an owner with no resolvable position when the viewer has an anchor", () => {
    expect(withinDiscoveryRadius(KIELNAROWA_PIN, null)).toBe(false);
  });

  it("falls back to showing everyone when the viewer has no anchor", () => {
    expect(withinDiscoveryRadius(null, WARSZAWA_CENTER)).toBe(true);
    expect(withinDiscoveryRadius(null, null)).toBe(true);
  });

  it("uses a generous default scope that is a superset of the client's max filter", () => {
    // The map's distance filter tops out at 50 km; the server scope must not
    // prune anything the client could still ask to see.
    expect(DISCOVERY_RADIUS_KM).toBeGreaterThanOrEqual(50);
  });
});
