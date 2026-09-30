import { t, type Locale } from "@/lib/i18n";

interface Props {
  breeds: string[];
  selectedBreed: string | null;
  onBreedChange: (breed: string | null) => void;
  locale: Locale;
}

export default function BreedSelect({ breeds, selectedBreed, onBreedChange, locale }: Props) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <label htmlFor="breed-filter" className="text-muted-foreground shrink-0 text-sm font-medium">
        {t(locale, "map.breedFilter")}
      </label>
      <select
        id="breed-filter"
        value={selectedBreed ?? ""}
        onChange={(e) => {
          onBreedChange(e.target.value === "" ? null : e.target.value);
        }}
        className="border-border bg-background text-foreground min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm"
      >
        <option value="">{t(locale, "map.allBreeds")}</option>
        {breeds.map((breed) => (
          <option key={breed} value={breed}>
            {breed}
          </option>
        ))}
      </select>
    </div>
  );
}
