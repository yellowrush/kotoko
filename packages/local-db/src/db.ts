import Dexie, { type EntityTable } from 'dexie';
import type {
  ChildProfile,
  UserPreference,
  FavoritePlace,
  KnowledgeProgress,
  PolicyTaskState,
  LocalMetadata,
  PlaceComment,
  PlaceVisit,
  PendingPlaceReport,
} from '@kodoko/domain';

export const DATABASE_NAME = 'kodoko-local';
export const SCHEMA_VERSION = 5;

export type StoredPolicyTaskState = PolicyTaskState & { id: string };

export class KodokoLocalDatabase extends Dexie {
  children!: EntityTable<ChildProfile, 'id'>;
  preferences!: EntityTable<UserPreference, 'id'>;
  favorites!: EntityTable<FavoritePlace, 'id'>;
  knowledgeProgress!: EntityTable<KnowledgeProgress, 'id'>;
  policyTasks!: EntityTable<PolicyTaskState, 'policyId'>;
  policyTaskEntries!: EntityTable<StoredPolicyTaskState, 'id'>;
  placeComments!: EntityTable<PlaceComment, 'id'>;
  placeVisits!: EntityTable<PlaceVisit, 'id'>;
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

    this.version(4)
      .stores({
        children: 'id, birthDate, createdAt, updatedAt',
        preferences: 'id, updatedAt',
        favorites: 'id, childId, placeId, [childId+placeId]',
        knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
        policyTasks: 'policyId, status, updatedAt',
        policyTaskEntries: 'id, &[childId+policyId], childId, policyId, status, updatedAt',
        placeComments: 'id, placeId, createdAt',
        pendingReports: 'id, placeId, createdAt',
        metadata: 'id',
      })
      .upgrade(async (tx) => {
        const legacyTasks = await tx.table('policyTasks').toArray();
        await tx.table('policyTaskEntries').bulkPut(
          legacyTasks
            .filter((task: PolicyTaskState) => task.childId)
            .map((task: PolicyTaskState) => ({
              ...task,
              id: policyTaskEntryId(task.childId!, task.policyId),
            })),
        );
        await tx
          .table('metadata')
          .put({ id: 'schema', schemaVersion: 4, updatedAt: new Date().toISOString() } satisfies LocalMetadata);
      });

    this.version(5)
      .stores({
        children: 'id, birthDate, createdAt, updatedAt',
        preferences: 'id, updatedAt',
        favorites: 'id, childId, placeId, [childId+placeId]',
        knowledgeProgress: 'id, childId, knowledgeId, [childId+knowledgeId]',
        policyTasks: 'policyId, status, updatedAt',
        policyTaskEntries: 'id, &[childId+policyId], childId, policyId, status, updatedAt',
        placeComments: 'id, placeId, createdAt',
        placeVisits: 'id, &[placeId+visitDate], placeId, visitDate, recordedAt, updatedAt',
        pendingReports: 'id, placeId, createdAt',
        metadata: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table('metadata')
          .put({ id: 'schema', schemaVersion: 5, updatedAt: new Date().toISOString() } satisfies LocalMetadata);
      });
  }
}

export function createDatabase(name: string = DATABASE_NAME): KodokoLocalDatabase {
  return new KodokoLocalDatabase(name);
}

export function policyTaskEntryId(childId: string, policyId: string): string {
  return `${childId}:${policyId}`;
}

export type {
  ChildProfile,
  UserPreference,
  FavoritePlace,
  KnowledgeProgress,
  PolicyTaskState,
  LocalMetadata,
  PlaceComment,
  PlaceVisit,
  PendingPlaceReport,
};
