import { describe, expect, it, vi } from 'vitest';
import { createExpression } from '@maplibre/maplibre-gl-style-spec';
import type { LayerSpecification, StyleSpecification } from 'maplibre-gl';
import { createFallbackIcon, patchOpenFreeMapStyle } from './openFreeMapStylePatch';

// 与 live liberty 样式实际下发的 filter 保持一致（2026-08 快照）
const LIBERTY_FILTERS: Record<string, unknown[]> = {
  boundary_3: [
    'all',
    ['>=', ['get', 'admin_level'], 3],
    ['<=', ['get', 'admin_level'], 6],
    ['!=', ['get', 'maritime'], 1],
    ['!=', ['get', 'disputed'], 1],
    ['!', ['has', 'claimed_by']],
  ],
  poi_r20: [
    'all',
    ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
    ['>=', ['get', 'rank'], 20],
  ],
  poi_r7: [
    'all',
    ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
    ['>=', ['get', 'rank'], 7],
    ['<', ['get', 'rank'], 20],
  ],
  poi_r1: [
    'all',
    ['match', ['geometry-type'], ['MultiPoint', 'Point'], true, false],
    ['>=', ['get', 'rank'], 1],
    ['<', ['get', 'rank'], 7],
  ],
  highway_shield_non_us: [
    'all',
    ['<=', ['get', 'ref_length'], 6],
    ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
    ['match', ['get', 'network'], ['us-highway', 'us-interstate', 'us-state'], false, true],
  ],
  label_country_3: [
    'all',
    ['==', ['get', 'class'], 'country'],
    ['>=', ['get', 'rank'], 3],
  ],
};

type EvaluateResult = { ok: unknown; warnings: string[] };

function evaluate(filter: unknown, properties: Record<string, unknown>): EvaluateResult {
  const result = createExpression(filter, null);
  if (result.result === 'error') {
    throw new Error(`expression parse error: ${JSON.stringify(result.value)}`);
  }
  const warnings: string[] = [];
  const spies = [
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      warnings.push(String(args[0]));
    }),
    vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      warnings.push(String(args[0]));
    }),
  ];
  try {
    const value = result.value.evaluate(
      { zoom: 12 },
      { type: 1 as const, id: 1, properties },
    );
    return { ok: value, warnings };
  } finally {
    spies.forEach((s) => s.mockRestore());
  }
}

describe('patched filters', () => {
  for (const [name, filter] of Object.entries(LIBERTY_FILTERS)) {
    describe(name, () => {
      it('no longer triggers the number-type warning on null/missing fields', () => {
        const patched = (patchOpenFreeMapStyle(makeStyle(filter)).layers[0] as {
          filter?: unknown;
        }).filter;
        const nullCase = evaluate(patched, { admin_level: null, rank: null, ref_length: null, class: 'country' });
        const missingCase = evaluate(patched, { class: 'country' });
        expect(nullCase.ok).toBe(false);
        expect(missingCase.ok).toBe(false);
        expect(nullCase.warnings).toEqual([]);
        expect(missingCase.warnings).toEqual([]);
      });

      it('keeps identical results when target fields are real numbers', () => {
        const original = evaluate(filter, { admin_level: 4, rank: 5, ref_length: 6, class: 'country' });
        const patchedFilter = (patchOpenFreeMapStyle(makeStyle(filter)).layers[0] as {
          filter?: unknown;
        }).filter;
        const patched = evaluate(
          patchedFilter,
          { admin_level: 4, rank: 5, ref_length: 6, class: 'country' },
        );
        expect(patched.ok).toBe(original.ok);
        expect(patched.warnings).toEqual([]);
      });
    });
  }
});

describe('unpatched filter', () => {
  it('still emits the known null warning (proves the guard matters)', () => {
    const { warnings } = evaluate(LIBERTY_FILTERS.boundary_3, { admin_level: null });
    expect(warnings.join('\n')).toContain('Expected value to be of type number');
  });
});

describe('patchOpenFreeMapStyle', () => {
  it('wraps numeric comparisons with a typeof guard', () => {
    const style = makeStyle(LIBERTY_FILTERS.boundary_3);
    const patched = patchOpenFreeMapStyle(style);
    const filter = (patched.layers[0] as { filter?: unknown }).filter as unknown[];
    expect(JSON.stringify(filter)).toContain('"case"');
    expect(JSON.stringify(filter)).toContain('"typeof"');
  });

  it('leaves unrelated layers and filters untouched', () => {
    const untouched: unknown[] = ['==', ['get', 'class'], 'country'];
    const style: StyleSpecification = {
      version: 8,
      sources: {},
      layers: [
        { id: 'hit', type: 'background' },
        { id: 'nocase', type: 'circle', source: 'test', filter: untouched },
      ] as unknown as LayerSpecification[],
    };
    const patched = patchOpenFreeMapStyle(style);
    expect((patched.layers[1] as { filter?: unknown }).filter).toEqual(untouched);
  });

  it('does not mutate the input style', () => {
    const filter = LIBERTY_FILTERS.boundary_3;
    const style = makeStyle(filter);
    const before = JSON.stringify(filter);
    patchOpenFreeMapStyle(style);
    expect(JSON.stringify(filter)).toBe(before);
  });
});

function makeStyle(filter: unknown): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [{ id: 'test', type: 'circle', source: 'test', filter } as LayerSpecification],
  };
}

describe('createFallbackIcon', () => {
  it('returns a sized RGBA buffer even without a 2d context', () => {
    const getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockReturnValue(null);
    try {
      const icon = createFallbackIcon();
      expect(icon.width).toBe(20);
      expect(icon.height).toBe(20);
      expect(icon.data).toHaveLength(20 * 20 * 4);
    } finally {
      getContextSpy.mockRestore();
    }
  });
});