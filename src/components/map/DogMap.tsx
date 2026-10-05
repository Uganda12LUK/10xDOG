import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DogWithOwner } from "@/types";
import { CITY_CENTERS } from "@/lib/geo";

// A stable per-dog jitter so dogs in the same town don't stack on one point but
// spread across the neighbourhood (~±2 km), as if on different streets. Purely
// visual: the distance filter measures town-center to town-center (see dogFilter),
// so widening this never changes which dogs a filter keeps.
function deterministicOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  // lat: 1° ≈ 111 km, lng: 1° ≈ 71 km at ~50°N → divisors tuned for ~±2 km each.
  return [((h % 1001) - 500) / 28000, (((h >> 4) % 1001) - 500) / 18000];
}

// The user's own "home base" marker — a brand-colored teardrop pin with a white
// doghouse glyph. Distinct from the round dog pins by shape, not a one-off color;
// colors come from tokens so it tracks light/dark.
const userIcon = L.divIcon({
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

function makeDogIcon(name: string) {
  const trimmed = name.trim();
  const initial = trimmed.length > 0 ? trimmed[0].toUpperCase() : "🐾";
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary);color:var(--color-primary-foreground);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.25);">${initial}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// Each dog is anchored to its owner's town (CITY_CENTERS), with a small
// deterministic offset so dogs in the same town don't overlap. Falls back to the
// map's default center when the owner's city is unknown.
function dogPosition(dog: DogWithOwner, fallback: [number, number]): [number, number] {
  const base = (dog.ownerCity != null ? CITY_CENTERS[dog.ownerCity] : undefined) ?? fallback;
  const [dlat, dlng] = deterministicOffset(dog.id);
  return [base[0] + dlat, base[1] + dlng];
}

// Fit the viewport to the dog pins so towns spread across the region stay visible.
// With a single dog, just center on it at a neighbourhood zoom.
function FitToDogs({ positions, center }: { positions: [number, number][]; center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) {
      map.setView(center, 12);
    } else if (positions.length === 1) {
      map.setView(positions[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
    }
  }, [positions, center, map]);
  return null;
}

interface Props {
  dogs: DogWithOwner[];
  center: [number, number];
  onDogSelect: (dog: DogWithOwner) => void;
  userCenter?: [number, number];
  onUserMove?: (pos: [number, number]) => void;
  radiusKm?: number | null;
}

export default function DogMap({ dogs, center, onDogSelect, userCenter, onUserMove, radiusKm }: Props) {
  const positioned = dogs.map((dog) => ({ dog, pos: dogPosition(dog, center) }));
  const userMarkerRef = useRef<L.Marker>(null);

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToDogs positions={positioned.map((p) => p.pos)} center={center} />

      {userCenter && radiusKm != null && (
        <Circle
          center={userCenter}
          radius={radiusKm * 1000}
          pathOptions={{ className: "dog-radius", weight: 2, fillOpacity: 0.06 }}
        />
      )}

      {userCenter && (
        <Marker
          position={userCenter}
          icon={userIcon}
          draggable
          ref={userMarkerRef}
          eventHandlers={{
            dragend: () => {
              const marker = userMarkerRef.current;
              if (marker && onUserMove) {
                const { lat, lng } = marker.getLatLng();
                onUserMove([lat, lng]);
              }
            },
          }}
        />
      )}

      {positioned.map(({ dog, pos }) => (
        <Marker
          key={dog.id}
          position={pos}
          icon={makeDogIcon(dog.name)}
          eventHandlers={{
            click: () => {
              onDogSelect(dog);
            },
          }}
        />
      ))}
    </MapContainer>
  );
}
