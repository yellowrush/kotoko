import { describe, expect, it } from 'vitest';
import { detailBackTo } from './navigation';

describe('detailBackTo', () => {
  it('uses a safe source path when it is provided', () => {
    expect(detailBackTo({ backTo: '/home' }, '/policies')).toBe('/home');
  });

  it('falls back when the source path is missing or unsafe', () => {
    expect(detailBackTo(undefined, '/knowledge')).toBe('/knowledge');
    expect(detailBackTo({ backTo: 'https://example.com' }, '/places')).toBe('/places');
  });
});
