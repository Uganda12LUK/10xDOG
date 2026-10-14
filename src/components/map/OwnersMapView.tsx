import { useState } from "react";
import type { DogWithOwner, PackStatus } from "@/types";
import { t, type Locale } from "@/lib/i18n";
import SearchFilters from "./SearchFilters";
import BottomSheet from "./BottomSheet";
import BoneButton from "@/components/pack/BoneButton";
import { CITY_CENTERS } from "@/lib/geo";
import { filterDogs, EMPTY_CRITERIA, type DogFilterCriteria } from "@/lib/dogFilter";

// DogMap is only rendered client-side (parent uses client:only="react")
import DogMap from "./DogMap";

interface Props {
  dogs: DogWithOwner[];
  city: string;
  userLocation: [number, number] | null;
  packStatusByOwner: Record<string, PackStatus>;
  locale: Locale;
}

// Default search radius (km) on load, so the map opens scoped to the user's area.
const DEFAULT_RADIUS_KM = 10;

function DogCard({
  dog,
  packStatus,
  locale,
  onClick,
}: {
  dog: DogWithOwner;
  packStatus: PackStatus;
  locale: Locale;
  onClick: (d: DogWithOwner) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {dog.photoUrl ? (
        <img src={dog.photoUrl} alt={dog.name} className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full text-lg">
          🐾
        </div>
      )}
      <div className="min-w-0 flex-1">
        <button
          onClick={() => {
            onClick(dog);
          }}
          className="card-interactive block min-w-0 text-left"
        >
          <p className="truncate text-sm font-medium">{dog.name}</p>
          <p className="text-muted-foreground truncate text-xs">{dog.breed}</p>
        </button>
        {/* Owner name links through to their profile (where the full bone/invite lives). */}
        <a href={`/map/${dog.ownerId}`} className="text-primary block truncate text-xs hover:underline">
          {dog.ownerName}
        </a>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <a
          href={`/meetings/new?receiver_id=${dog.ownerId}`}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
        >
          {t(locale, "owners.proposeWalk")}
        </a>
        <BoneButton ownerId={dog.ownerId} status={packStatus} locale={locale} />
      </div>
    </div>
  );
}

export default function OwnersMapView({ dogs, city, userLocation, packStatusByOwner, locale }: Props) {
  // Anchor the search on the user's saved home location when set, else the town center.
  // The marker is draggable on the map to re-center the search for the current session
  // (dragging here does NOT persist — that's changed in the profile).
  const cityCenter: [number, number] = CITY_CENTERS[city] ?? [52.2297, 21.0122];
  const [userCenter, setUserCenter] = useState<[number, number]>(userLocation ?? cityCenter);
  const [selectedDog, setSelectedDog] = useState<DogWithOwner | null>(null);
  const [criteria, setCriteria] = useState<DogFilterCriteria>({ ...EMPTY_CRITERIA, maxKm: DEFAULT_RADIUS_KM });

  const breeds = [...new Set(dogs.map((d) => d.breed))].sort();
  const filtered = filterDogs(dogs, criteria, userCenter);
  const statusFor = (ownerId: string): PackStatus => packStatusByOwner[ownerId] ?? "none";

  return (
    // On lg the whole view is bounded to the viewport (minus the desktop Topbar),
    // so the map fills the remaining height and the list scrolls inside its own
    // column — the page itself never grows a scrollbar from the map.
    <div className="relative lg:flex lg:h-[calc(100svh-7rem)] lg:flex-col lg:overflow-hidden">
      <SearchFilters breeds={breeds} criteria={criteria} onChange={setCriteria} locale={locale} />
      {/* Mobile: map stacked above the list. Desktop (lg): two panes — a sticky,
          viewport-tall map beside a scrollable results column, so a filter change
          shows in the list without scrolling. */}
      <div className="lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-rows-[1fr] lg:gap-4 lg:px-4">
        <div className="px-0 md:px-4 lg:h-full lg:min-h-0 lg:px-0">
          <div className="isolate h-[46svh] overflow-hidden md:h-[380px] md:rounded-2xl lg:h-full">
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
        <div className="divide-border divide-y lg:min-h-0 lg:overflow-y-auto">
          {filtered.map((dog) => (
            <DogCard
              key={dog.id}
              dog={dog}
              packStatus={statusFor(dog.ownerId)}
              locale={locale}
              onClick={setSelectedDog}
            />
          ))}
        </div>
      </div>
      <BottomSheet
        dog={selectedDog}
        packStatus={selectedDog ? statusFor(selectedDog.ownerId) : "none"}
        locale={locale}
        open={!!selectedDog}
        onClose={() => {
          setSelectedDog(null);
        }}
      />
    </div>
  );
}
