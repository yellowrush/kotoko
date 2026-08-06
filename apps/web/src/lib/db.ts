import {
  createDatabase,
  DexieChildRepository,
  FavoriteRepository,
  KnowledgeProgressRepository,
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