import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { OwnerWithDogs } from "@/types";

const CITY_CENTERS: Record<string, [number, number]> = {
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
};

function deterministicOffset(id: string): [number, number] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return [((h % 1001) - 500) / 100000, (((h >> 4) % 1001) - 500) / 100000];
}

function makeOwnerIcon(name: string) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return L.divIcon({
    className: "",
    html: `<div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary,#e05c2e);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,.25);">${initials}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

interface Props {
  owners: OwnerWithDogs[];
  center: [number, number];
  onOwnerSelect: (owner: OwnerWithDogs) => void;
}

export default function DogMap({ owners, center, onOwnerSelect }: Props) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <RecenterMap center={center} />
      {owners.map((owner) => {
        const [dlat, dlng] = deterministicOffset(owner.profile.id);
        const pos: [number, number] = [center[0] + dlat, center[1] + dlng];
        return (
          <Marker
            key={owner.profile.id}
            position={pos}
            icon={makeOwnerIcon(owner.profile.name)}
            eventHandlers={{
              click: () => {
                onOwnerSelect(owner);
              },
            }}
          />
        );
      })}
    </MapContainer>
  );
}

export { CITY_CENTERS };
