export type ChildProfile = {
  id: string;
  displayName: string;
  birthDate: string;
  interests: string[];
  accessibilityNeeds: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
};

export type CreateChildInput = {
  displayName: string;
  birthDate: string;
  interests?: string[];
  accessibilityNeeds?: string[];
};

export type UpdateChildInput = Partial<Omit<CreateChildInput, 'birthDate'>> & {
  birthDate?: string;
};

export function newChildProfile(input: CreateChildInput): ChildProfile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    displayName: input.displayName.trim(),
    birthDate: input.birthDate,
    interests: input.interests ?? [],
    accessibilityNeeds: input.accessibilityNeeds ?? [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: 1,
  };
}