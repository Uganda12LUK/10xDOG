import { t, type Locale } from "@/lib/i18n";
import { DOG_SIZES, DOG_TRAITS } from "@/lib/dogAttributes";
import { AGE_BUCKETS, type DogFilterCriteria } from "@/lib/dogFilter";
import { cn } from "@/lib/utils";

const DISTANCE_OPTIONS = [5, 10, 25, 50] as const;

interface Props {
  breeds: string[];
  criteria: DogFilterCriteria;
  onChange: (next: DogFilterCriteria) => void;
  locale: Locale;
}

const selectClass = "border-border bg-background text-foreground min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm";

export default function SearchFilters({ breeds, criteria, onChange, locale }: Props) {
  const set = (patch: Partial<DogFilterCriteria>) => {
    onChange({ ...criteria, ...patch });
  };

  const toggleTrait = (trait: string) => {
    const has = criteria.traits.includes(trait);
    set({ traits: has ? criteria.traits.filter((x) => x !== trait) : [...criteria.traits, trait] });
  };

  return (
    <div className="flex flex-col gap-2 px-4 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t(locale, "map.breedFilter")}
          value={criteria.breed ?? ""}
          onChange={(e) => {
            set({ breed: e.target.value || null });
          }}
          className={selectClass}
        >
          <option value="">{t(locale, "map.allBreeds")}</option>
          {breeds.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          aria-label={t(locale, "filter.size")}
          value={criteria.size ?? ""}
          onChange={(e) => {
            set({ size: (e.target.value || null) as DogFilterCriteria["size"] });
          }}
          className={selectClass}
        >
          <option value="">{t(locale, "filter.anySize")}</option>
          {DOG_SIZES.map((s) => (
            <option key={s} value={s}>
              {t(locale, `size.${s}`)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label={t(locale, "filter.age")}
          value={criteria.ageBucket ?? ""}
          onChange={(e) => {
            set({ ageBucket: (e.target.value || null) as DogFilterCriteria["ageBucket"] });
          }}
          className={selectClass}
        >
          <option value="">{t(locale, "filter.anyAge")}</option>
          {AGE_BUCKETS.map((a) => (
            <option key={a} value={a}>
              {t(locale, `age.${a}`)}
            </option>
          ))}
        </select>

        <select
          aria-label={t(locale, "filter.distance")}
          value={criteria.maxKm ?? ""}
          onChange={(e) => {
            set({ maxKm: e.target.value ? Number(e.target.value) : null });
          }}
          className={selectClass}
        >
          <option value="">{t(locale, "filter.distanceNoLimit")}</option>
          {DISTANCE_OPTIONS.map((km) => (
            <option key={km} value={km}>
              {km} km
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">{t(locale, "filter.character")}</span>
        {/* Single horizontally-scrollable row on mobile so the trait list doesn't
            wrap to several lines and push the map below the fold; wraps on desktop. */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0">
          {DOG_TRAITS.map((trait) => {
            const active = criteria.traits.includes(trait);
            return (
              <button
                key={trait}
                type="button"
                onClick={() => {
                  toggleTrait(trait);
                }}
                aria-pressed={active}
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground",
                )}
              >
                {t(locale, `trait.${trait}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
