import type { ChildProfile, CreateChildInput, UpdateChildInput } from './child';
import type { PolicyTaskState } from './policy';

export * from './child';
export * from './place';
export * from './knowledge';
export * from './policy';
export * from './region';
export * from './age';

export const kodokoBackupHeader = 'kodoko';

export type UserPreference = {
  id: string;
  locale: string;
  municipalityCode?: string;
  radiusKm?: number;
  indoorOutdoorPreference?: 'indoor' | 'outdoor' | 'mixed';
  updatedAt: string;
};

export type FavoritePlace = {
  id: string;
  childId?: string;
  placeId: string;
  createdAt: string;
};

export type KnowledgeProgress = {
  id: string;
  childId?: string;
  knowledgeId: string;
  status: 'unread' | 'read' | 'archived';
  readAt?: string;
  updatedAt: string;
};

export type LocalMetadata = {
  id: string;
  schemaVersion: number;
  updatedAt: string;
};

export interface ChildRepository {
  list(): Promise<ChildProfile[]>;
  getById(id: string): Promise<ChildProfile | null>;
  create(input: CreateChildInput): Promise<ChildProfile>;
  update(id: string, input: UpdateChildInput): Promise<ChildProfile>;
  remove(id: string): Promise<void>;
}

export type LocalBackup = {
  app: 'kodoko';
  version: number;
  exportedAt: string;
  children: ChildProfile[];
  preferences: UserPreference[];
  favorites: FavoritePlace[];
  knowledgeProgress: KnowledgeProgress[];
  policyTasks: PolicyTaskState[];
};