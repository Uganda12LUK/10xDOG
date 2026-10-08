import React, { useState } from "react";
import { PawPrint, Save } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import { BREEDS } from "@/lib/breeds";
import { DOG_SIZES, DOG_TRAITS } from "@/lib/dogAttributes";
import { t, type Locale } from "@/lib/i18n";
import type { Dog } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  dog?: Dog | null;
  serverError?: string | null;
  locale: Locale;
}

export default function DogForm({ dog, serverError, locale }: Props) {
  const [name, setName] = useState(dog?.name ?? "");
  const [breed, setBreed] = useState(dog?.breed ?? "");
  const [size, setSize] = useState<string>(dog?.size ?? "");
  const [traits, setTraits] = useState<string[]>(dog?.traits ?? []);
  const [birthdate, setBirthdate] = useState(dog?.birthdate ?? "");
  const [errors, setErrors] = useState<{ name?: string }>({});

  const today = new Date().toISOString().slice(0, 10);

  function validate() {
    const next: typeof errors = {};

    if (!name.trim()) {
      next.name = t(locale, "form.dog.nameRequired");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function clearError(field: keyof typeof errors) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    if (!validate()) {
      e.preventDefault();
    }
  }

  return (
    <form
      method="POST"
      action={dog ? `/api/dogs/${dog.id}` : "/api/dogs"}
      encType="multipart/form-data"
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="space-y-4">
          <FormField
            id="name"
            label={t(locale, "form.dog.name")}
            value={name}
            onChange={(v) => {
              setName(v);
              clearError("name");
            }}
            placeholder={t(locale, "form.dog.namePlaceholder")}
            error={errors.name}
            icon={<PawPrint className="size-4" />}
          />

          <div>
            <label htmlFor="breed" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "form.dog.breed")}
            </label>
            <select
              id="breed"
              name="breed"
              value={breed}
              onChange={(e) => {
                setBreed(e.target.value);
              }}
              className={cn(
                "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
                "focus:ring-ring focus:ring-2 focus:outline-none",
              )}
            >
              <option value="" disabled>
                {t(locale, "form.dog.selectBreed")}
              </option>
              {BREEDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="size" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "form.dog.size")}
            </label>
            <select
              id="size"
              name="size"
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
              }}
              className={cn(
                "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
                "focus:ring-ring focus:ring-2 focus:outline-none",
              )}
            >
              <option value="">—</option>
              {DOG_SIZES.map((s) => (
                <option key={s} value={s}>
                  {t(locale, `size.${s}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-4 lg:mt-0">
          <div>
            <span className="text-muted-foreground mb-1 block text-sm">{t(locale, "form.dog.traits")}</span>
            <div className="flex flex-wrap gap-2">
              {DOG_TRAITS.map((tr) => {
                const checked = traits.includes(tr);
                return (
                  <label
                    key={tr}
                    className={cn(
                      "cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-accent",
                    )}
                  >
                    <input
                      type="checkbox"
                      name="traits"
                      value={tr}
                      checked={checked}
                      onChange={(e) => {
                        setTraits((prev) => (e.target.checked ? [...prev, tr] : prev.filter((x) => x !== tr)));
                      }}
                      className="sr-only"
                    />
                    {t(locale, `trait.${tr}`)}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="birthdate" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "form.dog.birthdate")}
            </label>
            <input
              id="birthdate"
              name="birthdate"
              type="date"
              max={today}
              value={birthdate}
              onChange={(e) => {
                setBirthdate(e.target.value);
              }}
              className={cn(
                "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
                "focus:ring-ring focus:ring-2 focus:outline-none",
              )}
            />
          </div>

          <div>
            <label htmlFor="photo" className="text-muted-foreground mb-1 block text-sm">
              {t(locale, "form.dog.photo")}
            </label>
            {dog?.photoUrl ? (
              <img
                src={dog.photoUrl}
                alt="Current dog photo"
                className="border-border mb-2 size-16 rounded-full border object-cover"
              />
            ) : null}
            <input
              id="photo"
              name="photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={cn(
                "border-input bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
                "file:bg-primary file:text-primary-foreground file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1",
                "hover:file:bg-primary/90",
              )}
            />
          </div>
        </div>
      </div>

      <ServerError message={serverError} />

      <SubmitButton pendingText={t(locale, "form.dog.saving")} icon={<Save className="size-4" />}>
        {t(locale, "form.dog.submit")}
      </SubmitButton>
    </form>
  );
}
