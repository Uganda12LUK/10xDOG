import type { DogSize } from "@/lib/dogAttributes";

export interface Profile {
  id: string;
  name: string;
  // User-facing "street" (optional). NOTE: the DB column is still named
  // `district` — mapped in src/lib/services/profile.ts. Rename deferred.
  street: string | null;
  city: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  locationLat: number | null;
  locationLng: number | null;
  createdAt: string;
  updatedAt: string;
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
  traits?: string[];
  photo?: File | null;
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
export interface PackMember {
  connectionId: string;
  ownerId: string;
  profile: Profile;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
