import { useState, useEffect } from "react";
import type { OwnerWithDogs } from "@/types";
import FilterChips from "./FilterChips";
import BottomSheet from "./BottomSheet";
import { CITY_CENTERS } from "./DogMap";

// DogMap is only rendered client-side (parent uses client:only="react")
import DogMap from "./DogMap";

interface Props {
  owners: OwnerWithDogs[];
  city: string;
}

function OwnerCard({ owner, onClick }: { owner: OwnerWithDogs; onClick: (o: OwnerWithDogs) => void }) {
  const dogNames = owner.dogs.map((d) => d.name).join(", ");
  return (
    <button
      onClick={() => {
        onClick(owner);
      }}
      className="card-interactive flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-full font-semibold">
        {owner.profile.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{owner.profile.name}</p>
        {dogNames && <p className="text-muted-foreground truncate text-xs">{dogNames}</p>}
      </div>
    </button>
  );
}

export default function OwnersMapView({ owners, city }: Props) {
  const defaultCenter: [number, number] = CITY_CENTERS[city] ?? [52.2297, 21.0122];
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithDogs | null>(null);
  const [selectedBreed, setSelectedBreed] = useState<string | null>(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setCenter([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  const breeds = [...new Set(owners.flatMap((o) => o.dogs.map((d) => d.breed)))].sort();
  const filtered = selectedBreed ? owners.filter((o) => o.dogs.some((d) => d.breed === selectedBreed)) : owners;

  return (
    <div className="relative">
      <FilterChips breeds={breeds} selectedBreed={selectedBreed} onBreedChange={setSelectedBreed} />
      <div className="h-[calc(100dvh-200px)]">
        <DogMap owners={filtered} center={center} onOwnerSelect={setSelectedOwner} />
      </div>
      <div className="divide-border divide-y">
        {filtered.map((owner) => (
          <OwnerCard key={owner.profile.id} owner={owner} onClick={setSelectedOwner} />
        ))}
      </div>
      <BottomSheet
        owner={selectedOwner}
        open={!!selectedOwner}
        onClose={() => {
          setSelectedOwner(null);
        }}
      />
    </div>
  );
}
