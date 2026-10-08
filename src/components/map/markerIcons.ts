import L from "leaflet";

// Shared Leaflet marker icons so every map reads one source (no per-view duplication).
// Colors come from CSS tokens — `var(--color-*)` resolves inside divIcon HTML.

// The user's "home base" marker: a brand-coral teardrop pin with a white doghouse (buda)
// glyph. Used for the user's home on /map and for the home-location picker on /profile.
// Anchor is the nose tip, so the pin points at its coordinate.
export const userHomeIcon = L.divIcon({
  className: "",
  html: `<div style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.3));">
    <svg width="40" height="48" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 46C20 46 34 28 34 16A14 14 0 1 0 6 16C6 28 20 46 20 46Z" fill="var(--color-primary)" stroke="var(--color-primary-foreground)" stroke-width="2"/>
      <path d="M12 17 L20 9 L28 17 L26 17 L26 23 L14 23 L14 17 Z" fill="var(--color-primary-foreground)"/>
      <path d="M17.4 23 V19.4 A2.6 2.6 0 0 1 22.6 19.4 V23 Z" fill="var(--color-primary)"/>
    </svg>
  </div>`,
  iconSize: [40, 48],
  iconAnchor: [20, 46],
});
