import Dexie, { type EntityTable } from 'dexie';
import type {
  ChildProfile,
  UserPreference,
  FavoritePlace,
  KnowledgeProgress,
  PolicyTaskState,
  LocalMetadata,
  PlaceComment,
  PendingPlaceReport,
} from '@kodoko/domain';

export const DATABASE_NAME = 'kodoko-local';
export const SCHEMA_VERSION = 3;

export class KodokoLocalDatabase extends Dexie {
  children!: EntityTable<ChildProfile, 'id'>;
  preferences!: EntityTable<UserPreference, 'id'>;
  favorites!: EntityTable<FavoritePlace, 'id'>;
  knowledgeProgress!: EntityTable<KnowledgeProgress, 'id'>;
  policyTasks!: EntityTable<PolicyTaskState, 'policyId'>;
  placeComments!: EntityTable<PlaceComment, 'id'>;
  pendingReports!: EntityTable<PendingPlaceReport, 'id'>;
  metadata!: EntityTable<LocalMetadata, 'id'>;

  constructor(name: string = DATABASE_NAME) {
    super(name);

    this.version(1).stores({
      children: 'id, birthDate, createdAt, updatedAt',
    });

    this.version(2)
      .stores({
        children: 'id, birthDate, createdAt, updatedAt',
        preferences: 'id, updatedAt',
        favorites: 'id, childId, placeId, [childId+placeId]',
        knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
        policyTasks: 'policyId, status, updatedAt',
        metadata: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('metadata')
          .put({ id: 'schema', schemaVersion: 2, updatedAt: new Date().toISOString() } satisfies LocalMetadata);
      });

    this.version(3)
      .stores({
        children: 'id, birthDate, createdAt, updatedAt',
        preferences: 'id, updatedAt',
        favorites: 'id, childId, placeId, [childId+placeId]',
        knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
        policyTasks: 'policyId, status, updatedAt',
        placeComments: 'id, placeId, createdAt',
        pendingReports: 'id, placeId, createdAt',
        metadata: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('metadata')
          .put({ id: 'schema', schemaVersion: 3, updatedAt: new Date().toISOString() } satisfies LocalMetadata);
      });
  }
}

export function createDatabase(name: string = DATABASE_NAME): KodokoLocalDatabase {
  return new KodokoLocalDatabase(name);
}

export type {
  ChildProfile,
  UserPreference,
  FavoritePlace,
  KnowledgeProgress,
  PolicyTaskState,
  LocalMetadata,
  PlaceComment,
  PendingPlaceReport,
};