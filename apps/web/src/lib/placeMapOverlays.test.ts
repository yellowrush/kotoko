import { describe, expect, it } from 'vitest';
import {
  boundsForFeatureCollection,
  featuresByProperty,
  municipalityOverlayLayers,
  railOverlayLayers,
  MUNICIPALITY_BOUNDARY_LAYER_ID,
  RAIL_LINE_CASING_LAYER_ID,
  RAIL_LINE_INNER_LAYER_ID,
  type OverlayFeatureCollection,
} from './placeMapOverlays';

const collection: OverlayFeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: '13108', lineId: 'jr-sobu' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [139.7, 35.6],
          [139.8, 35.7],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { code: '13109', lineId: 'jr-yamanote' },
      geometry: {
        type: 'Point',
        coordinates: [139.6, 35.5],
      },
    },
  ],
};

describe('place map overlays', () => {
  it('filters overlay features by selected property', () => {
    const selected = featuresByProperty(collection, 'code', '13108');
    expect(selected.features).toHaveLength(1);
    expect(selected.features[0]?.properties?.code).toBe('13108');
  });

  it('computes bounds for selected overlay features', () => {
    const bounds = boundsForFeatureCollection(
      featuresByProperty(collection, 'code', '13108'),
    );
    expect(bounds).toEqual([
      [139.7, 35.6],
      [139.8, 35.7],
    ]);
  });

  it('uses dashed boundaries for municipality overlays', () => {
    const boundary = municipalityOverlayLayers().find(
      (layer) => layer.id === MUNICIPALITY_BOUNDARY_LAYER_ID,
    );
    expect(boundary?.paint['line-dasharray']).toEqual([1.5, 1.2]);
  });

  it('uses black and white rail overlay layers', () => {
    const layers = railOverlayLayers();
    const casing = layers.find((layer) => layer.id === RAIL_LINE_CASING_LAYER_ID);
    const inner = layers.find((layer) => layer.id === RAIL_LINE_INNER_LAYER_ID);

    expect(casing?.paint['line-color']).toBe('#111827');
    expect(inner?.paint['line-color']).toBe('#ffffff');
  });
});
