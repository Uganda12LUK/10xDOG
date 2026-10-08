import { useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Dog } from "@/types";
import { CITY_CENTERS } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { t, type Locale } from "@/lib/i18n";

interface Props {
  receiver: { id: string; city: string | null };
  dogs: Dog[];
  error?: string;
  locale: Locale;
}

// Meeting-location marker: a brand dog face whose muzzle tapers to a point — the
// nose tip is the icon anchor, so it marks the exact spot. Token colors (light/dark).
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35));">
    <svg width="44" height="54" viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 13 L7 3 L18 10 Z" fill="var(--color-primary)" stroke="var(--color-primary-foreground)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M32 13 L37 3 L26 10 Z" fill="var(--color-primary)" stroke="var(--color-primary-foreground)" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="M22 53 C13 42 8 36 8 24 A14 14 0 0 1 36 24 C36 36 31 42 22 53 Z" fill="var(--color-primary)" stroke="var(--color-primary-foreground)" stroke-width="2" stroke-linejoin="round"/>
      <circle cx="16" cy="23" r="2.3" fill="var(--color-primary-foreground)"/>
      <circle cx="28" cy="23" r="2.3" fill="var(--color-primary-foreground)"/>
      <circle cx="22" cy="40" r="3" fill="var(--color-primary-foreground)"/>
    </svg>
  </div>`,
  iconSize: [44, 54],
  iconAnchor: [22, 53],
});

// Lets the user tap anywhere on the map to move the pin (complements dragging it).
function MapClickHandler({ onPick }: { onPick: (pos: [number, number]) => void }) {
  useMapEvents({
    click: (e) => {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function MeetingForm({ receiver, dogs, error, locale }: Props) {
  const [selectedType, setSelectedType] = useState<"walk" | "breeding" | null>(null);
  const [selectedDogId, setSelectedDogId] = useState<string | null>(null);

  const center = CITY_CENTERS[receiver.city ?? ""] ?? CITY_CENTERS.Warszawa;
  const [position, setPosition] = useState<[number, number]>(center);
  const markerRef = useRef<L.Marker>(null);

  return (
    <form method="POST" action="/api/invitations" className="flex flex-col gap-6">
      <input type="hidden" name="receiver_id" value={receiver.id} />

      {error && (
        <p className="border-destructive bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-sm">
          {error}
        </p>
      )}

      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <span className="text-foreground text-sm font-medium">{t(locale, "meetingForm.type")}</span>
            <div className="flex gap-3">
              {(["walk", "breeding"] as const).map((type) => {
                const label = t(locale, `type.${type}`);
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
              <span className="text-foreground text-sm font-medium">{t(locale, "meetingForm.yourDog")}</span>
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
              {t(locale, "meetingForm.dateTime")}
            </label>
            <input
              id="scheduled_at"
              type="datetime-local"
              name="scheduled_at"
              required
              className="border-border bg-card text-foreground rounded-lg border px-3 py-2 text-sm"
            />
          </section>
        </div>

        <section className="mt-6 flex flex-col gap-2 lg:mt-0">
          <span className="text-foreground text-sm font-medium">{t(locale, "meetingForm.location")}</span>
          <p className="text-muted-foreground text-xs">{t(locale, "meetingForm.pinHint")}</p>
          <input type="hidden" name="location_lat" value={position[0]} />
          <input type="hidden" name="location_lng" value={position[1]} />
          <div className="border-border h-[220px] overflow-hidden rounded-lg border lg:h-[360px]">
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapClickHandler onPick={setPosition} />
              <Marker
                position={position}
                icon={pinIcon}
                draggable
                ref={markerRef}
                eventHandlers={{
                  dragend: () => {
                    const marker = markerRef.current;
                    if (marker) {
                      const { lat, lng } = marker.getLatLng();
                      setPosition([lat, lng]);
                    }
                  },
                }}
              />
            </MapContainer>
          </div>
        </section>
      </div>

      <button
        type="submit"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-3 text-sm font-medium transition-colors"
      >
        {t(locale, "meetingForm.submit")}
      </button>
    </form>
  );
}
