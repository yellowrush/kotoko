import { useEffect } from 'react';
import type { ChildProfile } from '@kodoko/domain';
import { useAppStore } from '../store/appStore';
import { useChildren } from './useChildren';

export function useActiveChild(): {
  children: ChildProfile[];
  active: ChildProfile | null;
  setActive: (id: string) => void;
  loading: boolean;
} {
  const { children, loading } = useChildren();
  const currentChildId = useAppStore((s) => s.currentChildId);
  const setCurrentChildId = useAppStore((s) => s.setCurrentChildId);

  useEffect(() => {
    if (currentChildId) return;
    if (children.length > 0) setCurrentChildId(children[0]?.id ?? null);
  }, [currentChildId, children, setCurrentChildId]);

  const active = children.find((c) => c.id === currentChildId) ?? null;

  function setActive(id: string) {
    if (children.some((c) => c.id === id)) setCurrentChildId(id);
  }

  return { children, active, setActive, loading };
}
