import { useEffect, useRef } from 'react';
// maplibre-gl 固定使用 v5（^5.24.0）：OpenFreeMap Quick Start 官方以 v5 为准，且
// OpenFreeMap 当前下发的 liberty 样式仍大量使用 legacy `["geometry-type"]` 表达式，
// 而 v6 的 style-spec v25 会对 legacy expressions 抛错（warning severity）导致图层不渲染。
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeoPoint } from '@kodoko/domain';
import type { FilteredPlace } from '../../lib/placeFilters';

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
  el.style.cursor = 'pointer';
  updateMarkerElement(el, 1, false);
  return el;
}

function updateMarkerElement(el: HTMLElement, number: number, active: boolean) {
  el.className = [
    'flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold shadow-md transition',
    active
      ? 'border-white bg-brand-700 text-white scale-125'
      : 'border-brand-700 bg-white text-brand-700',
  ].join(' ');
  el.textContent = String(number);
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
  const markersRef = useRef<Record<string, maplibregl.Marker>>({});
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelectPlace);
  onSelectRef.current = onSelectPlace;
  const onStyleErrorRef = useRef(onStyleError);
  onStyleErrorRef.current = onStyleError;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_URL,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialZoom,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('error', () => onStyleErrorRef.current?.());
    mapRef.current = map;

    return () => {
      markersRef.current = {};
      userMarkerRef.current = null;
      map.remove();
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
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPlaceId) return;
    const place = places.find((p) => p.id === selectedPlaceId);
    if (!place) return;
    map.flyTo({ center: [place.longitude, place.latitude], zoom: 14 });
  }, [selectedPlaceId, places]);

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
  }, [userLocation]);

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
  }, [places, selectedPlaceId]);

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}