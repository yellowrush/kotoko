import { useEffect, useRef, useState } from 'react';
// maplibre-gl 固定使用 v5（^5.24.0）：OpenFreeMap Quick Start 官方以 v5 为准，且
// OpenFreeMap 当前下发的 liberty 样式仍大量使用 legacy `["geometry-type"]` 表达式，
// 而 v6 的 style-spec v25 会对 legacy expressions 抛错（warning severity）导致图层不渲染。
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoPoint } from '@kodoko/domain';
import type { FilteredPlace } from '../../lib/placeFilters';
import type { StyleSpecification } from 'maplibre-gl';
import {
  createFallbackIcon,
  patchOpenFreeMapStyle,
} from '../../lib/openFreeMapStylePatch';
import {
  boundsForFeatureCollection,
  emptyFeatureCollection,
  featuresByProperty,
  municipalityOverlayLayers,
  MUNICIPALITY_SOURCE_ID,
  railOverlayLayers,
  RAIL_LINE_SOURCE_ID,
  RAIL_STATION_SOURCE_ID,
  type OverlayFeatureCollection,
} from '../../lib/placeMapOverlays';
import { getVisitMarkerToneClass } from '../../lib/placeVisitMarkers';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import { CATEGORY_ICON } from './categoryMeta';

const STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL ??
  'https://tiles.openfreemap.org/styles/liberty';

export type PlacesMapProps = {
  places: FilteredPlace[];
  selectedPlaceId?: string;
  onSelectPlace: (id: string) => void;
  initialCenter: GeoPoint;
  initialZoom?: number;
  userLocation?: GeoPoint | null;
  selectedMunicipalityCode?: string;
  selectedRailLineId?: string;
  visitCountsByPlaceId?: Record<string, number>;
  onStyleError?: () => void;
};

const GEO_ASSET_BASE = `${import.meta.env.BASE_URL}data/geo`;

function markerElement() {
  const el = document.createElement('div');
  el.className =
    'relative flex h-8 w-8 cursor-pointer items-center justify-center';
  el.setAttribute('role', 'button');
  el.tabIndex = 0;
  const inner = document.createElement('div');
  inner.className =
    'flex h-full w-full items-center justify-center rounded-full border-2 text-base shadow-md transition';
  el.appendChild(inner);
  return el;
}

function updateMarkerElement({
  el,
  emoji,
  active,
  visitCount,
  label,
}: {
  el: HTMLElement;
  emoji: string;
  active: boolean;
  visitCount: number;
  label: string;
}) {
  const inner = el.firstElementChild as HTMLElement;
  el.title = label;
  el.setAttribute('aria-label', label);
  inner.className = [
    'flex h-full w-full items-center justify-center rounded-full border-2 text-base shadow-md transition',
    getVisitMarkerToneClass(visitCount),
    active
      ? 'scale-125 border-white ring-2 ring-brand-600 shadow-lg'
      : 'hover:scale-110',
  ].join(' ');
  inner.textContent = emoji;
}

export function PlacesMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  initialCenter,
  initialZoom = 11,
  userLocation,
  selectedMunicipalityCode,
  selectedRailLineId,
  visitCountsByPlaceId = {},
  onStyleError,
}: PlacesMapProps) {
  const { t } = useAppTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const lastSelectedRef = useRef<string | undefined>(undefined);
  const lastUserLocRef = useRef<GeoPoint | undefined>(undefined);
  const lastOverlayFocusRef = useRef<string | undefined>(undefined);
  const onSelectRef = useRef(onSelectPlace);
  onSelectRef.current = onSelectPlace;
  const onStyleErrorRef = useRef(onStyleError);
  onStyleErrorRef.current = onStyleError;
  const [municipalityAsset, setMunicipalityAsset] =
    useState<OverlayFeatureCollection>();
  const [railLineAsset, setRailLineAsset] =
    useState<OverlayFeatureCollection>();
  const [railStationAsset, setRailStationAsset] =
    useState<OverlayFeatureCollection>();

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    // OpenFreeMap liberty 的数值比较 filter（admin_level / rank / ref_length）
    // 在 null 值上会触发 maplibre 的 number 类型警告，先在加载前就地修补。
    // fetch 或解析失败时退回原始 URL，保持原有降级行为。
    const init = async () => {
      let style: StyleSpecification | string = STYLE_URL;
      try {
        const res = await fetch(STYLE_URL);
        if (res.ok) {
          style = patchOpenFreeMapStyle(
            (await res.json()) as StyleSpecification,
          );
        }
      } catch {
        // 保持默认 URL 加载
      }
      if (cancelled) return;

      // 初始視角：已取得當前位置時以其為中心，否則回退到預設中心。
      // init 為 async（需先 fetch style），可能晚於定位完成，因此用 ref 讀取最新位置。
      const user = userLocationRef.current;
      const centerPoint = user ?? initialCenter;
      const map = new maplibregl.Map({
        container,
        style,
        center: [centerPoint.longitude, centerPoint.latitude],
        zoom: user ? 13 : initialZoom,
      });
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      );
      map.on('error', () => onStyleErrorRef.current?.());
      map.on('styleimagemissing', (e) => {
        if (!e.id || map.hasImage(e.id)) return;
        map.addImage(e.id, createFallbackIcon());
      });
      // MapLibre 默认在控件初始接入时自动展开 attribution（maplibre-compact-show），
      // 首次打开遮挡地图。样式加载完成后主动收起，用户仍可点击按钮展开。
      map.on('load', () => {
        const el = container.querySelector<HTMLElement>(
          '.maplibregl-ctrl-attrib',
        );
        if (el) {
          el.classList.remove('maplibregl-compact-show');
          el.removeAttribute('open');
        }
        setMapReady(true);
      });
      mapRef.current = map;
    };

    void init();

    return () => {
      cancelled = true;
      setMapReady(false);
      markersRef.current = {};
      userMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadOverlayAssets() {
      try {
        const [municipality, railLines, railStations] = await Promise.all([
          fetch(`${GEO_ASSET_BASE}/tokyo-municipalities.geojson`).then((res) =>
            res.json(),
          ),
          fetch(`${GEO_ASSET_BASE}/rail-lines.geojson`).then((res) =>
            res.json(),
          ),
          fetch(`${GEO_ASSET_BASE}/rail-stations.geojson`).then((res) =>
            res.json(),
          ),
        ]);
        if (cancelled) return;
        setMunicipalityAsset(municipality as OverlayFeatureCollection);
        setRailLineAsset(railLines as OverlayFeatureCollection);
        setRailStationAsset(railStations as OverlayFeatureCollection);
      } catch {
        // Overlay assets are optional public map affordances; markers still work.
      }
    }

    void loadOverlayAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const currentMap = mapRef.current;
    if (!currentMap || !mapReady) return;

    const map = currentMap;
    function ensureSource(sourceId: string) {
      if (map.getSource(sourceId)) return;
      map.addSource(sourceId, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      });
    }

    ensureSource(MUNICIPALITY_SOURCE_ID);
    ensureSource(RAIL_LINE_SOURCE_ID);
    ensureSource(RAIL_STATION_SOURCE_ID);

    for (const layer of [
      ...municipalityOverlayLayers(),
      ...railOverlayLayers(),
    ]) {
      if (map.getLayer(layer.id)) continue;
      map.addLayer(layer as unknown as maplibregl.LayerSpecification);
    }
  }, [mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selectedPlaceId) {
      if (lastSelectedRef.current === selectedPlaceId) return;
      lastSelectedRef.current = selectedPlaceId;
      const place = places.find((p) => p.id === selectedPlaceId);
      if (!place) return;
      map.flyTo({ center: [place.longitude, place.latitude], zoom: 14 });
    } else {
      lastSelectedRef.current = undefined;
    }
  }, [selectedPlaceId, places, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    // 定位 flyTo 放在 selected-place flyTo 之后：两者同时变化时以“現在地へ”为准。
    if (lastUserLocRef.current === userLocation) return;
    lastUserLocRef.current = userLocation;
    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 13,
    });
  }, [userLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const source = map.getSource(MUNICIPALITY_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!source) return;

    const selected = featuresByProperty(
      municipalityAsset,
      'code',
      selectedMunicipalityCode,
    );
    source.setData(selected);
    if (!selectedMunicipalityCode) return;

    const bounds = boundsForFeatureCollection(selected);
    const focusKey = `municipality:${selectedMunicipalityCode}`;
    if (!bounds || lastOverlayFocusRef.current === focusKey) return;
    lastOverlayFocusRef.current = focusKey;
    map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 650 });
  }, [municipalityAsset, selectedMunicipalityCode, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const lineSource = map.getSource(RAIL_LINE_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    const stationSource = map.getSource(RAIL_STATION_SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    if (!lineSource || !stationSource) return;

    const selectedLines = featuresByProperty(
      railLineAsset,
      'lineId',
      selectedRailLineId,
    );
    const selectedStations = featuresByProperty(
      railStationAsset,
      'lineId',
      selectedRailLineId,
    );
    lineSource.setData(selectedLines);
    stationSource.setData(selectedStations);
    if (!selectedRailLineId) return;

    const bounds = boundsForFeatureCollection(selectedLines);
    const focusKey = `rail:${selectedRailLineId}`;
    if (!bounds || lastOverlayFocusRef.current === focusKey) return;
    lastOverlayFocusRef.current = focusKey;
    map.fitBounds(bounds, { padding: 56, maxZoom: 12.5, duration: 650 });
  }, [railLineAsset, railStationAsset, selectedRailLineId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (userLocation) {
      const el = document.createElement('div');
      el.className =
        'h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md';
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([userLocation.longitude, userLocation.latitude])
        .addTo(map);
    }
  }, [userLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();
    const list = [...places].sort((a, b) => {
      if (a.distanceKm !== null && b.distanceKm !== null)
        return a.distanceKm - b.distanceKm;
      return 0;
    });

    list.forEach((place) => {
      seen.add(place.id);
      const active = place.id === selectedPlaceId;

      let marker = markersRef.current[place.id];
      if (!marker) {
        const element = markerElement();
        element.addEventListener('click', () => onSelectRef.current(place.id));
        element.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          onSelectRef.current(place.id);
        });
        marker = new maplibregl.Marker({ element })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map);
        markersRef.current[place.id] = marker;
      }
      const visitCount = visitCountsByPlaceId[place.id] ?? 0;
      updateMarkerElement({
        el: marker.getElement() as HTMLElement,
        emoji: CATEGORY_ICON[place.category],
        active,
        visitCount,
        label: t('places.visitCountAria', {
          name: place.name,
          count: visitCount,
        }),
      });
    });

    for (const id of Object.keys(markersRef.current)) {
      if (!seen.has(id)) {
        const marker = markersRef.current[id];
        if (marker) marker.remove();
        delete markersRef.current[id];
      }
    }
  }, [places, selectedPlaceId, mapReady, visitCountsByPlaceId, t]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
