import {
  createDatabase,
  DexieChildRepository,
  FavoriteRepository,
  KnowledgeProgressRepository,
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

export function getPreferenceRepository(): PreferenceRepository {
  return new PreferenceRepository(getDb());
}

export function getPolicyTaskRepository(): PolicyTaskRepository {
  return new PolicyTaskRepository(getDb());
}