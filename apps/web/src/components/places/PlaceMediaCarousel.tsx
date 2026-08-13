import type { ReactNode } from 'react';
import type { Place, PlaceMedia } from '@kodoko/domain';
import { useAppTranslation } from '../../hooks/useAppTranslation';
import {
  getPlacePlaceholderImageUrl,
  isPlaceholderPlaceMedia,
} from './placePlaceholderMedia';

function PlaceMediaSlide({
  media,
  index,
}: {
  media: PlaceMedia;
  index: number;
}) {
  if (media.type === 'video') {
    return (
      <div className="relative h-72 w-full shrink-0 snap-center bg-black">
        <video
          className="h-full w-full object-cover"
          controls
          preload="metadata"
          poster={media.thumbnailUrl}
          src={media.url}
          aria-label={media.alt ?? `video-${index + 1}`}
        />
      </div>
    );
  }

  return (
    <div className="h-72 w-full shrink-0 snap-center bg-gray-100">
      <img
        src={media.url}
        alt={media.alt ?? `photo-${index + 1}`}
        loading="lazy"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

type PlaceMediaCarouselProps = {
  place: Place;
  action?: ReactNode;
};

export function PlaceMediaCarousel({
  place,
  action,
}: PlaceMediaCarouselProps) {
  const { t } = useAppTranslation();
  const visibleMedia = place.media.filter(
    (media) => !isPlaceholderPlaceMedia(media),
  );

  if (visibleMedia.length === 0) {
    const placeholderUrl = getPlacePlaceholderImageUrl(place);

    return (
      <div className="relative h-72 overflow-hidden rounded-lg border border-brand-100 bg-gray-100 shadow-[0_4px_0_rgba(249,95,20,0.08),0_14px_24px_rgba(120,53,15,0.14)]">
        <img
          src={placeholderUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {action && <div className="absolute bottom-3 right-3">{action}</div>}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-brand-100 shadow-[0_4px_0_rgba(249,95,20,0.08),0_14px_24px_rgba(120,53,15,0.14)]">
      <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {visibleMedia.map((media, index) => (
          <PlaceMediaSlide key={media.id} media={media} index={index} />
        ))}
      </div>
      {visibleMedia.length > 1 && (
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
          {t('places.mediaCount', { count: visibleMedia.length })}
        </span>
      )}
      {action && <div className="absolute bottom-3 right-3">{action}</div>}
    </div>
  );
}
