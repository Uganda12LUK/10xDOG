import type { DogSize } from "@/lib/dogAttributes";

export interface Profile {
  id: string;
  name: string;
  district: string | null;
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
  district?: string | null;
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
