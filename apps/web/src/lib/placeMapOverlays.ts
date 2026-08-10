export const MUNICIPALITY_SOURCE_ID = 'kodoko-selected-municipality';
export const MUNICIPALITY_FILL_LAYER_ID = 'kodoko-selected-municipality-fill';
export const MUNICIPALITY_BOUNDARY_LAYER_ID = 'kodoko-selected-municipality-boundary';

export const RAIL_LINE_SOURCE_ID = 'kodoko-selected-rail-line';
export const RAIL_STATION_SOURCE_ID = 'kodoko-selected-rail-stations';
export const RAIL_LINE_CASING_LAYER_ID = 'kodoko-selected-rail-line-casing';
export const RAIL_LINE_INNER_LAYER_ID = 'kodoko-selected-rail-line-inner';
export const RAIL_STATION_CASING_LAYER_ID = 'kodoko-selected-rail-station-casing';
export const RAIL_STATION_INNER_LAYER_ID = 'kodoko-selected-rail-station-inner';

export type OverlayGeometry = {
  type: string;
  coordinates: unknown;
};

export type OverlayFeature = {
  type: 'Feature';
  properties?: Record<string, unknown>;
  geometry: OverlayGeometry;
};

export type OverlayFeatureCollection = {
  type: 'FeatureCollection';
  features: OverlayFeature[];
};

export type Bounds = [[number, number], [number, number]];

export function emptyFeatureCollection(): OverlayFeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

export function featuresByProperty(
  source: OverlayFeatureCollection | undefined,
  propertyName: string,
  propertyValue: string | undefined,
): OverlayFeatureCollection {
  if (!source || !propertyValue) return emptyFeatureCollection();
  return {
    type: 'FeatureCollection',
    features: source.features.filter(
      (feature) => feature.properties?.[propertyName] === propertyValue,
    ),
  };
}

export function boundsForFeatureCollection(
  collection: OverlayFeatureCollection,
): Bounds | undefined {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  function visit(coordinates: unknown): void {
    if (!Array.isArray(coordinates)) return;
    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number'
    ) {
      const lng = coordinates[0];
      const lat = coordinates[1];
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      return;
    }
    coordinates.forEach(visit);
  }

  collection.features.forEach((feature) => visit(feature.geometry.coordinates));
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return undefined;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export function municipalityOverlayLayers() {
  return [
    {
      id: MUNICIPALITY_FILL_LAYER_ID,
      type: 'fill',
      source: MUNICIPALITY_SOURCE_ID,
      paint: {
        'fill-color': '#111827',
        'fill-opacity': 0.06,
      },
    },
    {
      id: MUNICIPALITY_BOUNDARY_LAYER_ID,
      type: 'line',
      source: MUNICIPALITY_SOURCE_ID,
      paint: {
        'line-color': '#111827',
        'line-width': 2.5,
        'line-dasharray': [1.5, 1.2],
      },
    },
  ] as const;
}

export function railOverlayLayers() {
  return [
    {
      id: RAIL_LINE_CASING_LAYER_ID,
      type: 'line',
      source: RAIL_LINE_SOURCE_ID,
      paint: {
        'line-color': '#111827',
        'line-width': 7,
        'line-opacity': 0.92,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },
    {
      id: RAIL_LINE_INNER_LAYER_ID,
      type: 'line',
      source: RAIL_LINE_SOURCE_ID,
      paint: {
        'line-color': '#ffffff',
        'line-width': 3,
        'line-opacity': 0.98,
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
    },
    {
      id: RAIL_STATION_CASING_LAYER_ID,
      type: 'circle',
      source: RAIL_STATION_SOURCE_ID,
      paint: {
        'circle-color': '#111827',
        'circle-radius': 4.5,
        'circle-opacity': 0.92,
      },
    },
    {
      id: RAIL_STATION_INNER_LAYER_ID,
      type: 'circle',
      source: RAIL_STATION_SOURCE_ID,
      paint: {
        'circle-color': '#ffffff',
        'circle-radius': 2.4,
        'circle-opacity': 0.98,
      },
    },
  ] as const;
}
