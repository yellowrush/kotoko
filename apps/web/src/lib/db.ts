import {
  createDatabase,
  DexieChildRepository,
  FavoriteRepository,
  KnowledgeProgressRepository,
  PendingReportRepository,
  PlaceCommentRepository,
  PreferenceRepository,
  PolicyTaskRepository,
  type KodokoLocalDatabase,
} from '@kodoko/local-db';

let db: KodokoLocalDatabase | null = null;

export function getDb(): KodokoLocalDatabase {
  if (!db) db = createDatabase();
  return db;
}

export function getChildRepository(): DexieChildRepository {
  return new DexieChildRepository(getDb());
}

export function getFavoriteRepository(): FavoriteRepository {
  return new FavoriteRepository(getDb());
}

export function getKnowledgeProgressRepository(): KnowledgeProgressRepository {
  return new KnowledgeProgressRepository(getDb());
}

export function getPlaceCommentRepository(): PlaceCommentRepository {
  return new PlaceCommentRepository(getDb());
}

export function getPendingReportRepository(): PendingReportRepository {
  return new PendingReportRepository(getDb());
}

export function getPreferenceRepository(): PreferenceRepository {
  return new PreferenceRepository(getDb());
}

export function getPolicyTaskRepository(): PolicyTaskRepository {
  return new PolicyTaskRepository(getDb());
}