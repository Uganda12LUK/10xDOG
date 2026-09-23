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
