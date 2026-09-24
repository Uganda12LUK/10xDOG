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

export interface DogInput {
  name: string;
  breed: string;
  birthdate?: string | null;
  photo?: File | null;
}
