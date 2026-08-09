import type { Place } from '@kodoko/domain';

export type PlaceShareData = {
  title: string;
  text: string;
  url: string;
};

export type PlaceShareTarget = 'facebook' | 'line' | 'x';

type ShareablePlace = Pick<Place, 'id' | 'name' | 'shortDescription' | 'address'>;

export function buildPlaceShareUrl(placeId: string, origin?: string): string {
  const safeOrigin =
    origin ??
    (typeof window !== 'undefined' && window.location.origin !== 'null'
      ? window.location.origin
      : '');
  return `${safeOrigin}/places/${encodeURIComponent(placeId)}`;
}

export function buildPlaceShareData(
  place: ShareablePlace,
  appName: string,
  origin?: string,
): PlaceShareData {
  const details = [place.shortDescription, place.address]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return {
    title: place.name,
    text: [place.name, ...details, appName].join('\n'),
    url: buildPlaceShareUrl(place.id, origin),
  };
}

export function buildCopyShareText(data: PlaceShareData): string {
  return [data.text, data.url].filter(Boolean).join('\n');
}

export function buildPlaceShareTargetUrl(
  target: PlaceShareTarget,
  data: PlaceShareData,
): string {
  const encodedUrl = encodeURIComponent(data.url);
  const encodedText = encodeURIComponent(data.text);

  switch (target) {
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case 'line':
      return `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`;
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  }
}
