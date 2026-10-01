import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DogWithOwner } from "@/types";
import { CITY_CENTERS } from "@/lib/geo";

function deterministicOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return [((h % 1001) - 500) / 100000, (((h >> 4) % 1001) - 500) / 100000];
}

function makeDogIcon(name: string) {
  const trimmed = name.trim();
  const initial = trimmed.length > 0 ? trimmed[0].toUpperCase() : "🐾";
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary,#e05c2e);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.25);">${initial}</div>`,
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
}

export default function DogMap({ dogs, center, onDogSelect }: Props) {
  const positioned = dogs.map((dog) => ({ dog, pos: dogPosition(dog, center) }));

  return (
    <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitToDogs positions={positioned.map((p) => p.pos)} center={center} />
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
