import { getDb } from './db';
import { exportLocalBackup, importLocalBackup, type ImportMode } from '@kodoko/local-db';

export async function exportLocalData(): Promise<void> {
  const raw = await exportLocalBackup(getDb());
  const blob = new Blob([raw], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `kodoko-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function importLocalData(file: File, mode: ImportMode = 'merge'): Promise<number> {
  const raw = await file.text();
  const result = await importLocalBackup(getDb(), raw, mode);
  return result.created;
}