import { useState } from "react";
import type { DogWithOwner } from "@/types";
import type { Locale } from "@/lib/i18n";
import SearchFilters from "./SearchFilters";
import BottomSheet from "./BottomSheet";
import { CITY_CENTERS } from "@/lib/geo";
import { filterDogs, EMPTY_CRITERIA, type DogFilterCriteria } from "@/lib/dogFilter";

// DogMap is only rendered client-side (parent uses client:only="react")
import DogMap from "./DogMap";

interface Props {
  dogs: DogWithOwner[];
  city: string;
  userLocation: [number, number] | null;
  locale: Locale;
}

// Default search radius (km) on load, so the map opens scoped to the user's area.
const DEFAULT_RADIUS_KM = 10;

function DogCard({ dog, onClick }: { dog: DogWithOwner; onClick: (d: DogWithOwner) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <button
        onClick={() => {
          onClick(dog);
        }}
        className="card-interactive flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        {dog.photoUrl ? (
          <img src={dog.photoUrl} alt={dog.name} className="size-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-lg">
            🐾
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{dog.name}</p>
          <p className="text-muted-foreground truncate text-xs">{dog.breed}</p>
          <p className="text-muted-foreground truncate text-xs">{dog.ownerName}</p>
        </div>
      </button>
      <a
        href={`/meetings/new?receiver_id=${dog.ownerId}`}
        className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
      >
        Zaproponuj spacer
      </a>
    </div>
  );
}

export default function OwnersMapView({ dogs, city, userLocation, locale }: Props) {
  // Anchor the search on the user's saved home location when set, else the town center.
  // The marker is draggable on the map to re-center the search for the current session
  // (dragging here does NOT persist — that's changed in the profile).
  const cityCenter: [number, number] = CITY_CENTERS[city] ?? [52.2297, 21.0122];
  const [userCenter, setUserCenter] = useState<[number, number]>(userLocation ?? cityCenter);
  const [selectedDog, setSelectedDog] = useState<DogWithOwner | null>(null);
  const [criteria, setCriteria] = useState<DogFilterCriteria>({ ...EMPTY_CRITERIA, maxKm: DEFAULT_RADIUS_KM });

  const breeds = [...new Set(dogs.map((d) => d.breed))].sort();
  const filtered = filterDogs(dogs, criteria, userCenter);

  return (
    <div className="relative">
      <SearchFilters breeds={breeds} criteria={criteria} onChange={setCriteria} locale={locale} />
      {/* Mobile: map stacked above the list. Desktop (lg): two panes — a sticky,
          viewport-tall map beside a scrollable results column, so a filter change
          shows in the list without scrolling. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start lg:gap-4 lg:px-4">
        <div className="px-0 md:px-4 lg:px-0">
          <div className="isolate h-[260px] overflow-hidden md:h-[380px] md:rounded-2xl lg:sticky lg:top-4 lg:h-[calc(100svh-7rem)]">
            <DogMap
              dogs={filtered}
              center={userCenter}
              userCenter={userCenter}
              onUserMove={setUserCenter}
              radiusKm={criteria.maxKm}
              onDogSelect={setSelectedDog}
            />
          </div>
        </div>
        <div className="divide-border divide-y">
          {filtered.map((dog) => (
            <DogCard key={dog.id} dog={dog} onClick={setSelectedDog} />
          ))}
        </div>
      </div>
      <BottomSheet
        dog={selectedDog}
        open={!!selectedDog}
        onClose={() => {
          setSelectedDog(null);
        }}
      />
    </div>
  );
}
