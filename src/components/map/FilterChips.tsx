import { cn } from "@/lib/utils";

interface Props {
  breeds: string[];
  selectedBreed: string | null;
  onBreedChange: (breed: string | null) => void;
}

const DISABLED_CHIPS = ["Wiek", "Płeć", "Charakter"];

export default function FilterChips({ breeds, selectedBreed, onBreedChange }: Props) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-4 py-2">
      <button
        onClick={() => {
          onBreedChange(null);
        }}
        className={cn(
          "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
          selectedBreed === null
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background text-foreground border-border",
        )}
      >
        Wszystkie
      </button>
      {breeds.map((breed) => (
        <button
          key={breed}
          onClick={() => {
            onBreedChange(breed);
          }}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            selectedBreed === breed
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground border-border",
          )}
        >
          {breed}
        </button>
      ))}
      {DISABLED_CHIPS.map((label) => (
        <span
          key={label}
          className="border-border bg-background shrink-0 cursor-default rounded-full border px-3 py-1 text-sm font-medium opacity-50"
        >
          {label} · Wkrótce
        </span>
      ))}
    </div>
  );
}
