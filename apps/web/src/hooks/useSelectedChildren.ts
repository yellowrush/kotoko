import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { ChildProfile } from '@kodoko/domain';
import { useAppStore } from '../store/appStore';
import { useChildren } from './useChildren';

/** ホームで「今日一緒に行くこども」を複数選択するための状態。 */
export function useSelectedChildren(): {
  children: ChildProfile[];
  selected: ChildProfile[];
  selectedIds: string[];
  toggle: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  loading: boolean;
} {
  const { children, loading } = useChildren();
  const selectedIds = useAppStore((s) => s.selectedChildIds);
  const setSelectedIds = useAppStore((s) => s.setSelectedChildIds);
  const initialized = useRef(false);

  // 初期ロード時のみ、未選択なら全員を対象にする。
  useEffect(() => {
    if (initialized.current) return;
    if (loading || children.length === 0) return;
    initialized.current = true;
    if (selectedIds.length === 0) setSelectedIds(children.map((c) => c.id));
  }, [loading, children, selectedIds.length, setSelectedIds]);

  const toggle = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter((x) => x !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    },
    [selectedIds, setSelectedIds],
  );

  const selected = useMemo(
    () => children.filter((c) => selectedIds.includes(c.id)),
    [children, selectedIds],
  );

  return { children, selected, selectedIds, toggle, setSelectedIds, loading };
}