import { describe, expect, it } from 'vitest';
import {
  pickRandomItem,
  requestRandomPlace,
  subscribeRandomPlaceRequest,
} from './randomPlace';

describe('pickRandomItem', () => {
  it('returns null for empty lists', () => {
    expect(pickRandomItem([])).toBeNull();
  });

  it('picks a stable item when random is injected', () => {
    expect(pickRandomItem(['a', 'b', 'c'], () => 0.66)).toBe('b');
    expect(pickRandomItem(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });
});

describe('random place requests', () => {
  it('notifies active subscribers only', () => {
    let calls = 0;
    const unsubscribe = subscribeRandomPlaceRequest(() => {
      calls += 1;
    });

    requestRandomPlace();
    unsubscribe();
    requestRandomPlace();

    expect(calls).toBe(1);
  });
});
