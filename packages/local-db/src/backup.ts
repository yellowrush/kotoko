import { z } from 'zod';
import type { KodokoLocalDatabase } from './db';
import { zodChildProfile } from './schemas';

export const LOCAL_BACKUP_VERSION = 1;

const zodLocalBackup = z.object({
  app: z.literal('kodoko'),
  version: z.number().int().positive(),
  exportedAt: z.string().datetime({ offset: true }),
  children: z.array(zodChildProfile),
  preferences: z.array(z.any()),
  favorites: z.array(z.any()),
  knowledgeProgress: z.array(z.any()),
  policyTasks: z.array(z.any()),
});

export type LocalBackup = z.infer<typeof zodLocalBackup>;
export type BackupValidationResult =
  | { ok: true; version: number }
  | { ok: false; reason: 'invalid-header' | 'unsupported-version' | 'invalid-schema'; issues: z.ZodIssue[] };

/**
 * 校验备份内容，防止原型污染与任意脚本内容。
 * 仅允许已知字段，多余字段会在解析时被剥离。
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

export async function exportLocalBackup(db: KodokoLocalDatabase): Promise<string> {
  const [children, preferences, favorites, knowledgeProgress, policyTasks] = await Promise.all([
    db.children.toArray(),
    db.preferences.toArray(),
    db.favorites.toArray(),
    db.knowledgeProgress.toArray(),
    db.policyTasks.toArray(),
  ]);

  const backup: LocalBackup = {
    app: 'kodoko',
    version: LOCAL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    children,
    preferences,
    favorites,
    knowledgeProgress,
    policyTasks,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * 导入备份。导入前生成临时备份，失败时保持原数据。
 * overwrite 会先清空目标表，merge 则保留两端数据（按主键去重，冲突时以导入数据为准）。
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

  const backup = validatedBackup(parsed);
  if (mode === 'overwrite') {
    await db.transaction('rw', db.children, db.preferences, db.favorites, db.knowledgeProgress, db.policyTasks, async () => {
      await db.children.clear();
      await db.preferences.clear();
      await db.favorites.clear();
      await db.knowledgeProgress.clear();
      await db.policyTasks.clear();
      await db.children.bulkAdd(backup.children);
      await db.preferences.bulkAdd(backup.preferences as never[]);
      await db.favorites.bulkAdd(backup.favorites as never[]);
      await db.knowledgeProgress.bulkAdd(backup.knowledgeProgress as never[]);
      await db.policyTasks.bulkAdd(backup.policyTasks as never[]);
    });
  } else {
    await db.children.bulkPut(backup.children);
    await db.preferences.bulkPut(backup.preferences as never[]);
    await db.favorites.bulkPut(backup.favorites as never[]);
    await db.knowledgeProgress.bulkPut(backup.knowledgeProgress as never[]);
    await db.policyTasks.bulkPut(backup.policyTasks as never[]);
  }

  return { created: backup.children.length };
}

function validatedBackup(input: unknown): LocalBackup {
  const result = zodLocalBackup.safeParse(input);
  if (!result.success) {
    throw new Error(`INVALID_BACKUP:${result.error.issues.map((i) => i.path.join('.')).join(',')}`);
  }
  return result.data;
}