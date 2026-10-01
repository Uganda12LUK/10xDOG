import { useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Dog } from "@/types";
import { CITY_CENTERS } from "@/lib/geo";
import { cn } from "@/lib/utils";

interface Props {
  receiver: { id: string; city: string | null };
  dogs: Dog[];
  error?: string;
}

const pinIcon = L.divIcon({
  className: "text-primary text-2xl",
  html: "📍",
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export default function MeetingForm({ receiver, dogs, error }: Props) {
  const [selectedType, setSelectedType] = useState<"walk" | "breeding" | null>(null);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);

  const center = CITY_CENTERS[receiver.city ?? ""] ?? CITY_CENTERS.Warszawa;

  return (
    <form method="POST" action="/api/invitations" className="flex flex-col gap-6">
      <input type="hidden" name="receiver_id" value={receiver.id} />

      {error && (
        <p className="border-destructive bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-2">
        <span className="text-foreground text-sm font-medium">Typ spotkania</span>
        <div className="flex gap-3">
          {(["walk", "breeding"] as const).map((type) => {
            const label = type === "walk" ? "Walk" : "Breeding";
            const active = selectedType === type;
            return (
              <label
                key={type}
                className={cn(
                  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                <input
                  type="radio"
                  name="type"
                  value={type}
                  required
                  checked={active}
                  onChange={() => {
                    setSelectedType(type);
                  }}
                  className="sr-only"
                />
                {label}
              </label>
            );
          })}
        </div>
      </section>

      {dogs.length > 0 && (
        <section className="flex flex-col gap-2">
          <span className="text-foreground text-sm font-medium">Twój pies</span>
          {selectedDogId && <input type="hidden" name="dog_id" value={selectedDogId} />}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
            {dogs.map((dog) => {
              const active = selectedDogId === dog.id;
              return (
                <button
                  key={dog.id}
                  type="button"
                  onClick={() => {
                    setSelectedDogId(active ? null : dog.id);
                  }}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {dog.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <label htmlFor="scheduled_at" className="text-foreground text-sm font-medium">
          Data i czas
        </label>
        <input
          id="scheduled_at"
          type="datetime-local"
          name="scheduled_at"
          required
          className="border-border bg-card text-foreground rounded-lg border px-3 py-2 text-sm"
        />
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-foreground text-sm font-medium">Lokalizacja</span>
        <div className="border-border overflow-hidden rounded-lg border" style={{ height: "160px" }}>
          <MapContainer
            center={center}
            zoom={12}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            doubleClickZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={center} icon={pinIcon} />
          </MapContainer>
        </div>
      </section>

      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
      >
        Wyślij zaproszenie
      </button>
    </form>
  );
}
