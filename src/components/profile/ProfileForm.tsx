import React, { useState } from "react";
import { User, MapPin, Building2, Save } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import { t, type Locale } from "@/lib/i18n";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  profile?: Profile | null;
  serverError?: string | null;
  saved?: boolean;
  onboarding?: boolean;
  locale: Locale;
}

export default function ProfileForm({ profile, serverError, saved, onboarding, locale }: Props) {
  const [name, setName] = useState(profile?.name ?? "");
  const [district, setDistrict] = useState(profile?.district ?? "");
  const [city, setCity] = useState(profile?.city ?? "");
  const [errors, setErrors] = useState<{ name?: string }>({});

  function validate() {
    const next: typeof errors = {};

    if (!name.trim()) {
      next.name = "Name is required";
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
      action="/api/profile"
      encType="multipart/form-data"
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      {onboarding && !profile ? (
        <p className="border-border bg-accent text-accent-foreground rounded-lg border px-3 py-2 text-sm">
          Complete your profile to get started.
        </p>
      ) : null}

      <FormField
        id="name"
        label={t(locale, "form.profile.name")}
        value={name}
        onChange={(v) => {
          setName(v);
          clearError("name");
        }}
        placeholder="Your name"
        error={errors.name}
        icon={<User className="size-4" />}
      />

      <FormField
        id="district"
        label={t(locale, "form.profile.district")}
        value={district}
        onChange={(v) => {
          setDistrict(v);
        }}
        placeholder="Your district"
        icon={<MapPin className="size-4" />}
      />

      <FormField
        id="city"
        label={t(locale, "form.profile.city")}
        value={city}
        onChange={(v) => {
          setCity(v);
        }}
        placeholder="Your city"
        icon={<Building2 className="size-4" />}
      />

      <div>
        <label htmlFor="photo" className="text-muted-foreground mb-1 block text-sm">
          {t(locale, "form.profile.photo")}
        </label>
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="Current avatar"
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

      <ServerError message={serverError} />

      {saved ? <p className="text-success text-sm">Profile saved.</p> : null}

      <SubmitButton pendingText="Saving..." icon={<Save className="size-4" />}>
        {t(locale, "form.profile.submit")}
      </SubmitButton>
    </form>
  );
}
