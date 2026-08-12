import { render, screen } from '@testing-library/react';
import type { Place } from '@kodoko/domain';
import { beforeAll, describe, expect, it } from 'vitest';
import { i18n, initI18n } from '../../app/i18n';
import { PlaceMediaCarousel } from './PlaceMediaCarousel';
import { getPlacePlaceholderImageUrl } from './placePlaceholderMedia';

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'osm-playground-8b67993b',
    name: 'Kameido Playground',
    category: 'playground',
    latitude: 35.7041222,
    longitude: 139.8194266,
    address: 'Tokyo',
    municipalityCode: '13108',
    indoorOutdoor: 'outdoor',
    status: 'published',
    media: [],
    labels: [],
    provenance: [],
    version: 1,
    ...overrides,
  };
}

beforeAll(async () => {
  await initI18n();
});

describe('PlaceMediaCarousel', () => {
  it('renders a category placeholder image when public media is missing', () => {
    const { container } = render(
      <PlaceMediaCarousel place={makePlace()} fallbackEmoji="*" />,
    );

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toMatch(
      /^\/media\/placeholder\/playground-[123]\.svg$/,
    );
    expect(screen.getByText(i18n.t('places.mediaPending'))).toBeInTheDocument();
  });

  it('chooses the placeholder family from the place category', () => {
    expect(
      getPlacePlaceholderImageUrl(
        makePlace({ id: 'tokyo-family-restaurant', category: 'restaurant' }),
      ),
    ).toMatch(/^\/media\/placeholder\/restaurant-[123]\.svg$/);
  });
});
