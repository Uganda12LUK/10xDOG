import { useState } from "react";
import { PawPrint, User, Save, Plus, Trash2 } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { BREEDS } from "@/lib/breeds";
import { DOG_SIZES } from "@/lib/dogAttributes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  defaultName: string;
  locale: Locale;
}

interface DogDraft {
  key: number;
  name: string;
  breed: string;
  size: string;
  weight: string;
  photo: File | null;
}

let dogKeySeq = 1;
function emptyDog(): DogDraft {
  return { key: dogKeySeq++, name: "", breed: "", size: "", weight: "", photo: null };
}

// One-page onboarding: a clearly split "About you (owner)" section and a "Your dogs"
// section where more dogs can be added. Owner name + city are required; each dog
// needs a name + breed. Saves the profile then every dog via the existing endpoints.
export default function OnboardingWizard({ defaultName, locale }: Props) {
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState("");
  const [ownerPhoto, setOwnerPhoto] = useState<File | null>(null);
  const [dogs, setDogs] = useState<DogDraft[]>([emptyDog()]);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass = cn(
    "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
    "focus:ring-ring focus:ring-2 focus:outline-none",
  );
  const req = <span className="text-destructive ml-0.5">*</span>;

  function patchDog(key: number, patch: Partial<DogDraft>) {
    setDogs((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }
  function addDog() {
    setDogs((prev) => [...prev, emptyDog()]);
  }
  function removeDog(key: number) {
    setDogs((prev) => (prev.length > 1 ? prev.filter((d) => d.key !== key) : prev));
  }

  async function post(url: string, fields: Record<string, string>, photo: File | null): Promise<void> {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    if (photo) body.append("photo", photo);
    const res = await fetch(url, { method: "POST", body });
    // Endpoints redirect on both success and failure; a failure carries ?error=.
    const failed = !res.ok || new URL(res.url).searchParams.has("error");
    if (failed) {
      throw new Error(new URL(res.url).searchParams.get("error") ?? t(locale, "onboarding.saveError"));
    }
  }

  function validate(): boolean {
    if (name.trim().length === 0) {
      setError(t(locale, "onboarding.nameRequired"));
      return false;
    }
    if (city.trim().length === 0) {
      setError(t(locale, "onboarding.cityRequired"));
      return false;
    }
    for (let i = 0; i < dogs.length; i++) {
      const d = dogs[i];
      const who = `${t(locale, "onboarding.dogLabel")} ${i + 1}`;
      if (d.name.trim().length === 0) {
        setError(`${who}: ${t(locale, "onboarding.dogNameRequired")}`);
        return false;
      }
      if (d.breed.trim().length === 0) {
        setError(`${who}: ${t(locale, "onboarding.breedRequired")}`);
        return false;
      }
    }
    setError(null);
    return true;
  }

  async function finish() {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    try {
      await post("/api/profile", { name: name.trim(), city: city.trim() }, ownerPhoto);
      for (const d of dogs) {
        await post(
          "/api/dogs",
          { name: d.name.trim(), breed: d.breed.trim(), size: d.size, weight_kg: d.weight },
          d.photo,
        );
      }
      // Confirm success before leaving, then hand off to the dashboard.
      setSaved(true);
      window.setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "onboarding.saveError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1 text-center">
        <div className="text-4xl">🐾</div>
        <h1 className="text-foreground text-xl font-bold">{t(locale, "onboarding.welcomeTitle")}</h1>
        <p className="text-muted-foreground mx-auto max-w-sm text-sm">{t(locale, "onboarding.welcomeBody")}</p>
      </header>

      {/* About you (owner) */}
      <section className="border-border space-y-4 rounded-xl border p-4">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <User className="size-4" /> {t(locale, "onboarding.ownerSection")}
        </h2>
        <div>
          <label htmlFor="o-name" className="text-muted-foreground mb-1 block text-sm">
            {t(locale, "onboarding.yourName")}
            {req}
          </label>
          <input
            id="o-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            placeholder={t(locale, "onboarding.yourNamePlaceholder")}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="o-city" className="text-muted-foreground mb-1 block text-sm">
            {t(locale, "onboarding.yourCity")}
            {req}
          </label>
          <input
            id="o-city"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
            }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="o-ownerphoto" className="text-muted-foreground mb-1 block text-sm">
            {t(locale, "onboarding.yourPhoto")}
          </label>
          <p className="text-muted-foreground mb-2 text-xs">{t(locale, "onboarding.yourPhotoHint")}</p>
          <input
            id="o-ownerphoto"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              setOwnerPhoto(e.target.files?.[0] ?? null);
            }}
            className={inputClass}
          />
          {ownerPhoto ? <p className="text-success mt-1 text-xs">{t(locale, "onboarding.photoChosen")}</p> : null}
        </div>
      </section>

      {/* Your dogs */}
      <section className="space-y-3">
        <h2 className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <PawPrint className="size-4" /> {t(locale, "onboarding.dogsSection")}
        </h2>
        <p className="text-muted-foreground text-xs">{t(locale, "onboarding.dogBody")}</p>

        {dogs.map((d, i) => (
          <div key={d.key} className="border-border space-y-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground text-sm font-medium">
                {t(locale, "onboarding.dogLabel")} {i + 1}
              </span>
              {dogs.length > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    removeDog(d.key);
                  }}
                  aria-label={t(locale, "onboarding.removeDog")}
                  className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-sm">
                {t(locale, "onboarding.dogName")}
                {req}
              </label>
              <input
                value={d.name}
                onChange={(e) => {
                  patchDog(d.key, { name: e.target.value });
                }}
                className={inputClass}
              />
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-sm">
                {t(locale, "form.dog.breed")}
                {req}
              </label>
              <input
                list="o-breeds"
                value={d.breed}
                onChange={(e) => {
                  patchDog(d.key, { breed: e.target.value });
                }}
                placeholder={t(locale, "form.dog.selectBreed")}
                autoComplete="off"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-muted-foreground mb-1 block text-sm">{t(locale, "form.dog.size")}</label>
                <select
                  value={d.size}
                  onChange={(e) => {
                    patchDog(d.key, { size: e.target.value });
                  }}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {DOG_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {t(locale, `size.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted-foreground mb-1 block text-sm">{t(locale, "form.dog.weight")}</label>
                <input
                  type="number"
                  min="0"
                  max="150"
                  step="0.1"
                  inputMode="decimal"
                  value={d.weight}
                  onChange={(e) => {
                    patchDog(d.key, { weight: e.target.value });
                  }}
                  placeholder={t(locale, "form.dog.weightPlaceholder")}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="text-muted-foreground mb-1 block text-sm">{t(locale, "onboarding.dogPhoto")}</label>
              <p className="text-muted-foreground mb-2 text-xs">{t(locale, "onboarding.dogPhotoHint")}</p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  patchDog(d.key, { photo: e.target.files?.[0] ?? null });
                }}
                className={inputClass}
              />
              {d.photo ? <p className="text-success mt-1 text-xs">{t(locale, "onboarding.photoChosen")}</p> : null}
            </div>
          </div>
        ))}

        <datalist id="o-breeds">
          {BREEDS.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>

        <button
          type="button"
          onClick={() => {
            addDog();
          }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
        >
          <Plus className="size-4" /> {t(locale, "onboarding.addDog")}
        </button>
      </section>

      {error ? <p className="text-destructive text-sm">{error}</p> : null}
      {saved ? <p className="text-success text-sm font-medium">{t(locale, "onboarding.savedOk")}</p> : null}

      <button
        type="button"
        onClick={() => void finish()}
        disabled={submitting || saved}
        className={cn(buttonVariants(), "w-full gap-1")}
      >
        <Save className="size-4" /> {submitting ? t(locale, "onboarding.saving") : t(locale, "onboarding.finish")}
      </button>
    </div>
  );
}
