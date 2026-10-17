import { useMemo, useState } from "react";
import { PawPrint, User, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { BREEDS } from "@/lib/breeds";
import { DOG_SIZES } from "@/lib/dogAttributes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  defaultName: string;
  locale: Locale;
}

// A guided, hand-holding onboarding. It explains step by step what to enter and
// WHOSE photo belongs where (owner vs dog), then saves everything at the end by
// posting to the existing /api/profile and /api/dogs endpoints — no new backend.
// Those endpoints redirect; we detect failure by an `error=` param on the final URL.
export default function OnboardingWizard({ defaultName, locale }: Props) {
  const steps = ["welcome", "you", "dog", "summary"] as const;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Owner
  const [name, setName] = useState(defaultName);
  const [city, setCity] = useState("");
  const [ownerPhoto, setOwnerPhoto] = useState<File | null>(null);

  // Dog
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [size, setSize] = useState("");
  const [weight, setWeight] = useState("");
  const [dogPhoto, setDogPhoto] = useState<File | null>(null);

  const ownerPhotoUrl = useMemo(() => (ownerPhoto ? URL.createObjectURL(ownerPhoto) : null), [ownerPhoto]);
  const dogPhotoUrl = useMemo(() => (dogPhoto ? URL.createObjectURL(dogPhoto) : null), [dogPhoto]);

  function canAdvance(): boolean {
    if (steps[step] === "you") return name.trim().length > 0;
    if (steps[step] === "dog") return dogName.trim().length > 0 && breed.trim().length > 0;
    return true;
  }

  async function post(url: string, fields: Record<string, string>, photo: File | null): Promise<void> {
    const body = new FormData();
    for (const [k, v] of Object.entries(fields)) body.append(k, v);
    if (photo) body.append("photo", photo);
    const res = await fetch(url, { method: "POST", body });
    // Endpoints redirect on both success and failure; a failure carries ?error=.
    const failed = !res.ok || new URL(res.url).searchParams.has("error");
    if (failed) {
      const message = new URL(res.url).searchParams.get("error");
      throw new Error(message ?? t(locale, "onboarding.saveError"));
    }
  }

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await post("/api/profile", { name: name.trim(), city: city.trim() }, ownerPhoto);
      await post("/api/dogs", { name: dogName.trim(), breed: breed.trim(), size, weight_kg: weight }, dogPhoto);
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : t(locale, "onboarding.saveError"));
      setSubmitting(false);
    }
  }

  const inputClass = cn(
    "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
    "focus:ring-ring focus:ring-2 focus:outline-none",
  );

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {steps.map((s, i) => (
          <span
            key={s}
            className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>

      {steps[step] === "welcome" && (
        <section className="space-y-3 text-center">
          <div className="text-5xl">🐾</div>
          <h2 className="text-foreground text-xl font-bold">{t(locale, "onboarding.welcomeTitle")}</h2>
          <p className="text-muted-foreground mx-auto max-w-sm text-sm">{t(locale, "onboarding.welcomeBody")}</p>
        </section>
      )}

      {steps[step] === "you" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold">
              <User className="size-5" /> {t(locale, "onboarding.youTitle")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">{t(locale, "onboarding.youBody")}</p>
          </div>
          <div>
            <label htmlFor="o-name" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "onboarding.yourName")}
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
            {ownerPhotoUrl ? (
              <img src={ownerPhotoUrl} alt="" className="border-border mb-2 size-16 rounded-full border object-cover" />
            ) : null}
            <input
              id="o-ownerphoto"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setOwnerPhoto(e.target.files?.[0] ?? null);
              }}
              className={inputClass}
            />
          </div>
        </section>
      )}

      {steps[step] === "dog" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-foreground flex items-center gap-2 text-lg font-semibold">
              <PawPrint className="size-5" /> {t(locale, "onboarding.dogTitle")}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">{t(locale, "onboarding.dogBody")}</p>
          </div>
          <div>
            <label htmlFor="o-dogname" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "onboarding.dogName")}
            </label>
            <input
              id="o-dogname"
              value={dogName}
              onChange={(e) => {
                setDogName(e.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="o-breed" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "form.dog.breed")}
            </label>
            <input
              id="o-breed"
              list="o-breeds"
              value={breed}
              onChange={(e) => {
                setBreed(e.target.value);
              }}
              placeholder={t(locale, "form.dog.selectBreed")}
              autoComplete="off"
              className={inputClass}
            />
            <datalist id="o-breeds">
              {BREEDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="o-size" className="text-muted-foreground mb-1 block text-sm">
                {t(locale, "form.dog.size")}
              </label>
              <select
                id="o-size"
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
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
              <label htmlFor="o-weight" className="text-muted-foreground mb-1 block text-sm">
                {t(locale, "form.dog.weight")}
              </label>
              <input
                id="o-weight"
                type="number"
                min="0"
                max="150"
                step="0.1"
                inputMode="decimal"
                value={weight}
                onChange={(e) => {
                  setWeight(e.target.value);
                }}
                placeholder={t(locale, "form.dog.weightPlaceholder")}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label htmlFor="o-dogphoto" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "onboarding.dogPhoto")}
            </label>
            <p className="text-muted-foreground mb-2 text-xs">{t(locale, "onboarding.dogPhotoHint")}</p>
            {dogPhotoUrl ? (
              <img src={dogPhotoUrl} alt="" className="border-border mb-2 size-16 rounded-full border object-cover" />
            ) : null}
            <input
              id="o-dogphoto"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setDogPhoto(e.target.files?.[0] ?? null);
              }}
              className={inputClass}
            />
          </div>
        </section>
      )}

      {steps[step] === "summary" && (
        <section className="space-y-4">
          <h2 className="text-foreground text-lg font-semibold">{t(locale, "onboarding.summaryTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t(locale, "onboarding.summaryBody")}</p>
          <dl className="divide-border border-border divide-y rounded-xl border text-sm">
            <Row label={t(locale, "onboarding.yourName")} value={name || "—"} />
            <Row label={t(locale, "onboarding.yourCity")} value={city || "—"} />
            <Row label={t(locale, "onboarding.yourPhoto")} value={ownerPhoto ? "✓" : "—"} />
            <Row label={t(locale, "onboarding.dogName")} value={dogName || "—"} />
            <Row label={t(locale, "form.dog.breed")} value={breed || "—"} />
            <Row label={t(locale, "form.dog.size")} value={size ? t(locale, `size.${size}`) : "—"} />
            <Row label={t(locale, "form.dog.weight")} value={weight ? `${weight} kg` : "—"} />
            <Row label={t(locale, "onboarding.dogPhoto")} value={dogPhoto ? "✓" : "—"} />
          </dl>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
        </section>
      )}

      {/* Nav buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            setStep((s) => Math.max(0, s - 1));
          }}
          disabled={step === 0 || submitting}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1", step === 0 && "invisible")}
        >
          <ArrowLeft className="size-4" /> {t(locale, "onboarding.back")}
        </button>

        {steps[step] !== "summary" ? (
          <button
            type="button"
            onClick={() => {
              setStep((s) => s + 1);
            }}
            disabled={!canAdvance()}
            className={cn(buttonVariants({ size: "sm" }), "gap-1")}
          >
            {t(locale, "onboarding.next")} <ArrowRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finish()}
            disabled={submitting}
            className={cn(buttonVariants({ size: "sm" }), "gap-1")}
          >
            <Check className="size-4" /> {submitting ? t(locale, "onboarding.saving") : t(locale, "onboarding.finish")}
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground truncate font-medium">{value}</dd>
    </div>
  );
}
