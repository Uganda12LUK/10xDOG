import React, { useState } from "react";
import { PawPrint, Save } from "lucide-react";
import { FormField } from "@/components/auth/FormField";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { ServerError } from "@/components/auth/ServerError";
import { BREEDS } from "@/lib/breeds";
import type { Dog } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  dog?: Dog | null;
  serverError?: string | null;
}

export default function DogForm({ dog, serverError }: Props) {
  const [name, setName] = useState(dog?.name ?? "");
  const [breed, setBreed] = useState(dog?.breed ?? "");
  const [birthdate, setBirthdate] = useState(dog?.birthdate ?? "");
  const [errors, setErrors] = useState<{ name?: string }>({});

  const today = new Date().toISOString().slice(0, 10);

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
      action={dog ? `/api/dogs/${dog.id}` : "/api/dogs"}
      encType="multipart/form-data"
      className="space-y-4"
      onSubmit={handleSubmit}
      noValidate
    >
      <FormField
        id="name"
        label="Name"
        value={name}
        onChange={(v) => {
          setName(v);
          clearError("name");
        }}
        placeholder="Your dog's name"
        error={errors.name}
        icon={<PawPrint className="size-4" />}
      />

      <div>
        <label htmlFor="breed" className="mb-1 block text-sm text-blue-100/80">
          Breed
        </label>
        <select
          id="breed"
          name="breed"
          value={breed}
          onChange={(e) => {
            setBreed(e.target.value);
          }}
          className={cn(
            "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white",
            "focus:ring-2 focus:ring-purple-400 focus:outline-none",
          )}
        >
          <option value="" disabled>
            Select a breed
          </option>
          {BREEDS.map((b) => (
            <option key={b} value={b} className="text-black">
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="birthdate" className="mb-1 block text-sm text-blue-100/80">
          Birth date
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
            "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white",
            "focus:ring-2 focus:ring-purple-400 focus:outline-none",
          )}
        />
      </div>

      <div>
        <label htmlFor="photo" className="mb-1 block text-sm text-blue-100/80">
          Photo
        </label>
        {dog?.photoUrl ? (
          <img
            src={dog.photoUrl}
            alt="Current dog photo"
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

      <SubmitButton pendingText="Saving..." icon={<Save className="size-4" />}>
        Save dog
      </SubmitButton>
    </form>
  );
}
