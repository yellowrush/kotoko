import { useEffect, useRef, useState } from 'react';
// maplibre-gl 固定使用 v5（^5.24.0）：OpenFreeMap Quick Start 官方以 v5 为准，且
// OpenFreeMap 当前下发的 liberty 样式仍大量使用 legacy `["geometry-type"]` 表达式，
// 而 v6 的 style-spec v25 会对 legacy expressions 抛错（warning severity）导致图层不渲染。
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoPoint } from '@kodoko/domain';
import type { FilteredPlace } from '../../lib/placeFilters';
import type { StyleSpecification } from 'maplibre-gl';
import { createFallbackIcon, patchOpenFreeMapStyle } from '../../lib/openFreeMapStylePatch';

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
  onStyleError?: () => void;
};

function markerElement() {
  const el = document.createElement('div');
  el.className = 'relative flex h-7 w-7 cursor-pointer items-center justify-center';
  const inner = document.createElement('div');
  inner.className = 'flex h-full w-full items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition';
  el.appendChild(inner);
  return el;
}

function updateMarkerElement(el: HTMLElement, number: number, active: boolean) {
  const inner = el.firstElementChild as HTMLElement;
  inner.className = [
    'flex h-full w-full items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition',
    active
      ? 'border-white bg-brand-700 text-white scale-125'
      : 'border-brand-700 bg-white text-brand-700',
  ].join(' ');
  inner.textContent = String(number);
}

export function PlacesMap({
  places,
  selectedPlaceId,
  onSelectPlace,
  initialCenter,
  initialZoom = 11,
  userLocation,
  onStyleError,
}: PlacesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const userLocationRef = useRef(userLocation);
  userLocationRef.current = userLocation;
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelectPlace);
  onSelectRef.current = onSelectPlace;
  const onStyleErrorRef = useRef(onStyleError);
  onStyleErrorRef.current = onStyleError;

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
          style = patchOpenFreeMapStyle((await res.json()) as StyleSpecification);
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
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      map.on('error', () => onStyleErrorRef.current?.());
      map.on('styleimagemissing', (e) => {
        if (!e.id || map.hasImage(e.id)) return;
        map.addImage(e.id, createFallbackIcon());
      });
      mapRef.current = map;
      setMapReady(true);
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
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) return;

    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 13,
    });
  }, [userLocation, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 14 });
  }, [selectedPlaceId, places, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) userMarkerRef.current.remove();
    if (userLocation) {
      const el = document.createElement('div');
      el.className = 'h-4 w-4 rounded-full border-2 border-white bg-blue-600 shadow-md';
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
      if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
      return 0;
    });

    list.forEach((place, index) => {
      seen.add(place.id);
      const active = place.id === selectedPlaceId;

      let marker = markersRef.current[place.id];
      if (!marker) {
        const element = markerElement();
        element.addEventListener('click', () => onSelectRef.current(place.id));
        marker = new maplibregl.Marker({ element })
          .setLngLat([place.longitude, place.latitude])
          .addTo(map);
        markersRef.current[place.id] = marker;
      }
      updateMarkerElement(marker.getElement() as HTMLElement, index + 1, active);
    });

    for (const id of Object.keys(markersRef.current)) {
      if (!seen.has(id)) {
        const marker = markersRef.current[id];
        if (marker) marker.remove();
        delete markersRef.current[id];
      }
    }
  }, [places, selectedPlaceId, mapReady]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}