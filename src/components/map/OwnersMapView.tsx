import { useState, useEffect } from "react";
import type { DogWithOwner } from "@/types";
import FilterChips from "./FilterChips";
import BottomSheet from "./BottomSheet";
import { CITY_CENTERS } from "./DogMap";

// DogMap is only rendered client-side (parent uses client:only="react")
import DogMap from "./DogMap";

interface Props {
  dogs: DogWithOwner[];
  city: string;
}

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

export default function OwnersMapView({ dogs, city }: Props) {
  const defaultCenter: [number, number] = CITY_CENTERS[city] ?? [52.2297, 21.0122];
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [selectedDog, setSelectedDog] = useState<DogWithOwner | null>(null);
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setCenter([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  const breeds = [...new Set(dogs.map((d) => d.breed))].sort();
  const filtered = selectedBreed ? dogs.filter((d) => d.breed === selectedBreed) : dogs;

  return (
    <div className="relative">
      <FilterChips breeds={breeds} selectedBreed={selectedBreed} onBreedChange={setSelectedBreed} />
      <div className="px-0 md:px-4">
        <div className="isolate h-[260px] overflow-hidden md:h-[380px] md:rounded-2xl">
          <DogMap dogs={filtered} center={center} onDogSelect={setSelectedDog} />
        </div>
      </div>
      <div className="divide-border divide-y">
        {filtered.map((dog) => (
          <DogCard key={dog.id} dog={dog} onClick={setSelectedDog} />
        ))}
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
