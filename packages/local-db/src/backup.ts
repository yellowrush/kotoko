import { z } from 'zod';
import type {
  ChildProfile,
  FavoritePlace,
  KnowledgeProgress,
  PlaceComment,
  PolicyTaskState,
  UserPreference,
} from '@kodoko/domain';
import type { KodokoLocalDatabase } from './db';
import { zodLocalBackup } from './schemas';

export const LOCAL_BACKUP_VERSION = 2;

type BackupEntities = {
  children: ChildProfile[];
  preferences: UserPreference[];
  favorites: FavoritePlace[];
  knowledgeProgress: KnowledgeProgress[];
  policyTasks: PolicyTaskState[];
  placeComments: PlaceComment[];
};

export type LocalBackup = {
  app: 'kodoko';
  version: number;
  exportedAt: string;
} & BackupEntities;

type Snapshot = BackupEntities;

type BackupValidationResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'invalid-header' | 'unsupported-version' | 'invalid-schema'; issues: z.ZodIssue[] };

function backupTables(db: KodokoLocalDatabase) {
  return [
    db.children,
    db.preferences,
    db.favorites,
    db.knowledgeProgress,
    db.policyTasks,
    db.placeComments,
  ] as const;
}

async function snapshotAll(db: KodokoLocalDatabase): Promise<Snapshot> {
  const [children, preferences, favorites, knowledgeProgress, policyTasks, placeComments] =
    await Promise.all([
      db.children.toArray(),
      db.preferences.toArray(),
      db.favorites.toArray(),
      db.knowledgeProgress.toArray(),
      db.policyTasks.toArray(),
      db.placeComments.toArray(),
    ]);
  return { children, preferences, favorites, knowledgeProgress, policyTasks, placeComments };
}

async function restoreSnapshot(db: KodokoLocalDatabase, snapshot: Snapshot): Promise<void> {
  await db.transaction('rw', ...backupTables(db), async () => {
    for (const table of backupTables(db)) {
      await table.clear();
    }
    await db.children.bulkPut(snapshot.children);
    await db.preferences.bulkPut(snapshot.preferences);
    await db.favorites.bulkPut(snapshot.favorites);
    await db.knowledgeProgress.bulkPut(snapshot.knowledgeProgress);
    await db.policyTasks.bulkPut(snapshot.policyTasks);
    await db.placeComments.bulkPut(snapshot.placeComments);
  });
}

/**
 * 校验备份内容，防止原型污染与任意脚本内容。
 * 通过 strict 模式只接受已知字段与合法值，未知字段会被拒绝。
 */
export function validateBackup(input: unknown): BackupValidationResult {
  if (Array.isArray(input) || typeof input !== 'object' || input === null) {
    return { ok: false, reason: 'invalid-header', issues: [] };
  }
  const record = input as Record<string, unknown>;
  if (record['app'] !== 'kodoko') {
    return { ok: false, reason: 'invalid-header', issues: [] };
  }

  const version = typeof record['version'] === 'number' ? record['version'] : 0;
  if (version > LOCAL_BACKUP_VERSION) {
    return { ok: false, reason: 'unsupported-version', issues: [] };
  }

  const parsed = zodLocalBackup.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid-schema', issues: parsed.error.issues };
  }

  return { ok: true, version };
}

export type ImportMode = 'overwrite' | 'merge';

/** 返回当前本地数据快照（不含备份头）。 */
export async function exportLocalBackup(db: KodokoLocalDatabase): Promise<Snapshot> {
  return snapshotAll(db);
}

/** 导出为带 app 标识头的 JSON 字符串，用于下载/恢复。 */
export async function exportLocalBackupJson(db: KodokoLocalDatabase): Promise<string> {
  const backup = await snapshotAll(db);
  return JSON.stringify(
    {
      app: 'kodoko',
      version: LOCAL_BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      ...backup,
    } satisfies LocalBackup,
    null,
    2,
  );
}

/** 删除全部本地数据（儿童/偏好/收藏/已读/政策任务/地点评论）。不可恢复，调用前由 UI 确认。 */
export async function clearAllData(db: KodokoLocalDatabase): Promise<void> {
  await db.transaction('rw', ...backupTables(db), async () => {
    for (const table of backupTables(db)) {
      await table.clear();
    }
  });
}

/**
 * 导入备份。导入前生成临时备份（内存快照），失败时恢复原数据。
 * overwrite 先清空目标表；merge 保留两端数据（按主键去重，冲突以导入数据为准）。
 * 两种模式均在同一事务内执行，配合快照恢复保证失败时保持原数据。
 */
export async function importLocalBackup(
  db: KodokoLocalDatabase,
  raw: string,
  mode: ImportMode,
): Promise<{ created: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON');
  }

  const validation = validateBackup(parsed);
  if (!validation.ok) {
    throw new Error(`INVALID_BACKUP:${validation.reason}`);
  }

  const backup = zodLocalBackup.parse(parsed);
  const snapshot = await snapshotAll(db);

  try {
    await db.transaction('rw', ...backupTables(db), async () => {
      if (mode === 'overwrite') {
        for (const table of backupTables(db)) {
          await table.clear();
        }
      }
      await db.children.bulkAdd(backup.children);
      await db.preferences.bulkPut(backup.preferences);
      await db.favorites.bulkPut(backup.favorites);
      await db.knowledgeProgress.bulkPut(backup.knowledgeProgress);
      await db.policyTasks.bulkPut(backup.policyTasks);
      if (backup.placeComments && backup.placeComments.length > 0) {
        await db.placeComments.bulkPut(backup.placeComments);
      }
    });
  } catch (err) {
    await restoreSnapshot(db, snapshot);
    throw err;
  }

  return { created: backup.children.length };
}