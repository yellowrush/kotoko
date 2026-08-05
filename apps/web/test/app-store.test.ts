import { describe, expect, it } from 'vitest';
import { useAppStore } from '../src/store/appStore';

describe('useAppStore', () => {
  it('defaults to ja locale and no current child', () => {
    expect(useAppStore.getState().locale).toBe('ja');
    expect(useAppStore.getState().currentChildId).toBeNull();
  });

  it('updates locale and current child', () => {
    useAppStore.getState().setLocale('zh-CN');
    useAppStore.getState().setCurrentChildId('c1');

    expect(useAppStore.getState().locale).toBe('zh-CN');
    expect(useAppStore.getState().currentChildId).toBe('c1');
  });

  it('resets between tests via fresh store', () => {
    useAppStore.setState({ locale: 'ja', currentChildId: null });
    expect(useAppStore.getState().locale).toBe('ja');
  });
});