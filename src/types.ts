export interface Profile {
  id: string;
  name: string;
  district: string | null;
  city: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileInput {
  name: string;
  district?: string | null;
  city?: string | null;
  photo?: File | null;
}

export interface Dog {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  birthdate: string | null;
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
}

export interface DogInput {
  name: string;
  breed: string;
  birthdate?: string | null;
  photo?: File | null;
}
