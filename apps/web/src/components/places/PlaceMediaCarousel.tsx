import { useTranslation } from 'react-i18next';
import type { Place, PlaceMedia } from '@kodoko/domain';

function PlaceMediaSlide({ media, index }: { media: PlaceMedia; index: number }) {
  if (media.type === 'video') {
    return (
      <div className="relative h-72 w-full shrink-0 snap-center bg-black">
        <video
          className="h-full w-full object-cover"
          controls
          preload="metadata"
          poster={media.thumbnailUrl}
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
  fallbackEmoji: string;
};

export function PlaceMediaCarousel({ place, fallbackEmoji }: PlaceMediaCarouselProps) {
  const { t } = useTranslation();

  if (place.media.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-100 to-amber-50 text-sm text-gray-500">
        <span className="text-6xl">{fallbackEmoji}</span>
        <span>{t('places.mediaPending')}</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
        {place.media.map((media, index) => (
          <PlaceMediaSlide key={media.id} media={media} index={index} />
        ))}
      </div>
      {place.media.length > 1 && (
        <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-medium text-white">
          {t('places.mediaCount', { count: place.media.length })}
        </span>
      )}
    </div>
  );
}