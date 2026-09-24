import React, { useState } from "react";
import { User, MapPin, Building2, Save } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import type { Profile } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  profile?: Profile | null;
  serverError?: string | null;
  saved?: boolean;
  onboarding?: boolean;
}

export default function ProfileForm({ profile, serverError, saved, onboarding }: Props) {
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
        <p className="rounded-lg border border-blue-400/30 bg-blue-900/30 px-3 py-2 text-sm text-blue-200">
          Complete your profile to get started.
        </p>
      ) : null}

      <FormField
        id="name"
        label="Name"
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
        label="District"
        value={district}
        onChange={(v) => {
          setDistrict(v);
        }}
        placeholder="Your district"
        icon={<MapPin className="size-4" />}
      />

      <FormField
        id="city"
        label="City"
        value={city}
        onChange={(v) => {
          setCity(v);
        }}
        placeholder="Your city"
        icon={<Building2 className="size-4" />}
      />

      <div>
        <label htmlFor="photo" className="mb-1 block text-sm text-blue-100/80">
          Photo
        </label>
        {profile?.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt="Current avatar"
            className="mb-2 size-16 rounded-full border border-white/20 object-cover"
          />
        ) : null}
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className={cn(
            "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white",
            "file:mr-3 file:rounded-md file:border-0 file:bg-purple-600 file:px-3 file:py-1 file:text-white",
            "hover:file:bg-purple-500",
          )}
        />
      </div>

      <ServerError message={serverError} />

      {saved ? <p className="text-sm text-green-300">Profile saved.</p> : null}

      <SubmitButton pendingText="Saving..." icon={<Save className="size-4" />}>
        Save profile
      </SubmitButton>
    </form>
  );
}
