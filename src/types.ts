import type { DogSize } from "@/lib/dogAttributes";

// Public profile — safe to send to any authenticated viewer. Private location
// (street + GPS) lives in `profile_locations` (owner-only) and is NOT part of this
// shape; read it for the viewer's own profile via getOwnLocation → OwnerLocation.
export interface Profile {
  id: string;
  name: string;
  city: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// The owner's private location, read only for the viewer themselves (owner-only RLS
// on `profile_locations`). `street` is the app-facing name of the DB `district` column.
export interface OwnerLocation {
  street: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

// A profile shape safe to send to any authenticated viewer. Omits street,
// locationLat, locationLng, createdAt, updatedAt — the foreign-read seam
// (getPublicProfile) never surfaces precise location or audit timestamps.
export interface PublicProfile {
  id: string;
  name: string;
  city: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
}

export interface ProfileInput {
  name: string;
  street?: string | null;
  city?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  photo?: File | null;
}

export interface Dog {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  birthdate: string | null;
  size: DogSize | null;
  weightKg: number | null;
  traits: string[];
  photoPath: string | null;
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerWithDogs {
  profile: Profile;
  dogs: Dog[];
}

export type DogWithOwner = Dog & {
  ownerId: string;
  ownerName: string;
  ownerCity: string | null;
  ownerAvatarUrl: string | null;
};

export interface Invitation {
  id: string;
  senderId: string;
  receiverId: string;
  type: "walk" | "breeding";
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  updatedAt: string;
  dogId: string | null;
  scheduledAt: string | null;
  locationLat: number | null;
  locationLng: number | null;
}

export interface DogInput {
  name: string;
  breed: string;
  birthdate?: string | null;
  size?: DogSize | null;
  weightKg?: number | null;
  traits?: string[];
  photo?: File | null;
}

export type DogEventType = "vaccination" | "vet_visit" | "exam" | "grooming" | "medication" | "other";
export type DogEventRecurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface DogEvent {
  id: string;
  dogId: string;
  ownerId: string;
  title: string;
  type: DogEventType;
  eventDate: string; // yyyy-mm-dd — first (or only) occurrence
  recurrence: DogEventRecurrence;
  recurrenceInterval: number;
  notes: string | null;
  createdAt: string;
}

export interface DogEventInput {
  dogId: string;
  title: string;
  type: DogEventType;
  eventDate: string;
  recurrence: DogEventRecurrence;
  recurrenceInterval: number;
  notes?: string | null;
}

export interface PackConnection {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  updatedAt: string;
}

// The viewer's relationship to another owner, derived from pack_connections.
// Drives the bone button / pack badge on a profile.
export type PackStatus = "none" | "pending_out" | "pending_in" | "accepted";

// A pack member paired with the connection row that links them to the viewer.
// The pack is a pack of DOGS — `dogs` carries the member's dogs so the UI leads
// with them; the owner (profile) is the human behind them.
export interface PackMember {
  connectionId: string;
  ownerId: string;
  profile: PublicProfile;
  dogs: { id: string; name: string; photoUrl: string | null }[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
