import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DogWithOwner } from "@/types";
import { dogMapPosition } from "@/lib/dogFilter";
import { userHomeIcon } from "./markerIcons";

// Escape a value before embedding it in divIcon HTML. The photo URL is derived
// from a storage path that includes a user-supplied file extension, so treat it
// as untrusted in attribute context.
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// The dog's map marker: its profile photo in a circular, brand-ringed badge. When
// the owner hasn't set a photo, fall back to the dog's initial on a solid pin.
function makeDogIcon(name: string, photoUrl: string | null) {
  const trimmed = name.trim();
  const initial = trimmed.length > 0 ? escapeHtml(trimmed[0].toUpperCase()) : "🐾";
  const inner = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="font-size:13px;font-weight:600;">${initial}</span>`;
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;overflow:hidden;background:var(--color-primary);color:var(--color-primary-foreground);display:flex;align-items:center;justify-content:center;border:2px solid var(--color-primary);box-shadow:0 2px 6px rgba(0,0,0,.25);">${inner}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
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
  // Pins share their coordinates with the distance filter (dogMapPosition), so the
  // circle only ever contains pins the filter kept. A dog with no resolvable city
  // has no pin — we drop it here rather than snap it onto the user's own location.
  const positioned = dogs
    .map((dog) => ({ dog, pos: dogMapPosition(dog) }))
    .filter((p): p is { dog: DogWithOwner; pos: [number, number] } => p.pos !== null);
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
          icon={userHomeIcon}
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
          icon={makeDogIcon(dog.name, dog.photoUrl)}
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
