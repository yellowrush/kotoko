import { cleanup, render, screen } from '@testing-library/react';
import type { Place } from '@kodoko/domain';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { i18n, initI18n } from '../../app/i18n';
import { PlaceMediaCarousel } from './PlaceMediaCarousel';
import {
  getGoogleMapsSearchUrl,
  getPlacePlaceholderImageUrl,
  hasPublicPlaceMedia,
} from './placePlaceholderMedia';

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

afterEach(() => {
  cleanup();
});

describe('PlaceMediaCarousel', () => {
  it('renders a category placeholder image when public media is missing', () => {
    const { container } = render(
      <PlaceMediaCarousel
        place={makePlace()}
        action={
          <a
            href="https://www.google.com/maps/search/?api=1&query=Kameido"
            aria-label={i18n.t('places.googleMapsPhotos')}
          >
            M
          </a>
        }
      />,
    );

    const image = container.querySelector('img');
    expect(image?.getAttribute('src')).toMatch(
      /^\/media\/placeholder\/playground-[123]\.svg$/,
    );
    const link = screen.getByRole('link', {
      name: i18n.t('places.googleMapsPhotos'),
    });
    const oldPendingLabel = ['写真', 'は準備中です'].join('');

    expect(link).toHaveAttribute('href', expect.stringContaining('google.com'));
    expect(screen.queryByText(i18n.t('places.googleMapsPhotos'))).not.toBeInTheDocument();
    expect(screen.queryByText(oldPendingLabel)).not.toBeInTheDocument();
  });

  it('treats placeholder-only media as missing public media', () => {
    const place = makePlace({
      media: [
        {
          id: 'osm-playground-8b67993b-placeholder',
          type: 'image',
          url: '/media/placeholder/playground-1.svg',
          alt: '亀戸三丁目第3児童遊園',
          credit: 'Kodoko placeholder',
          license: 'placeholder-blocked',
          sourceUrl: 'https://example.com/kameido-playground',
          cover: true,
        },
      ],
    });

    render(<PlaceMediaCarousel place={place} />);

    expect(hasPublicPlaceMedia(place)).toBe(false);
    expect(
      screen.queryByRole('link', {
        name: i18n.t('places.googleMapsPhotos'),
      }),
    ).not.toBeInTheDocument();
  });

  it('binds video media URLs to the rendered player', () => {
    render(
      <PlaceMediaCarousel
        place={makePlace({
          media: [
            {
              id: 'event-video',
              type: 'video',
              url: 'https://example.com/event.mp4',
              alt: 'event video',
              credit: 'Official website',
              license: 'official-site-video',
              sourceUrl: 'https://example.com/event',
              cover: true,
            },
          ],
        })}
      />,
    );

    expect(screen.getByLabelText('event video')).toHaveAttribute(
      'src',
      'https://example.com/event.mp4',
    );
  });

  it('chooses the placeholder family from the place category', () => {
    expect(
      getPlacePlaceholderImageUrl(
        makePlace({ id: 'tokyo-family-restaurant', category: 'restaurant' }),
      ),
    ).toMatch(/^\/media\/placeholder\/restaurant-[123]\.svg$/);
  });

  it('builds a Google Maps search URL from public place metadata', () => {
    const url = getGoogleMapsSearchUrl(
      makePlace({ name: '亀戸三丁目第3児童遊園', address: '東京都江東区亀戸3-12-10' }),
    );

    expect(url).toContain('https://www.google.com/maps/search/?');
    expect(decodeURIComponent(url)).toContain('亀戸三丁目第3児童遊園');
    expect(decodeURIComponent(url)).toContain('東京都江東区亀戸3-12-10');
    expect(decodeURIComponent(url)).toContain('35.7041222,139.8194266');
  });

  it('adds coordinates to Google Maps searches when the address is generic', () => {
    const url = getGoogleMapsSearchUrl(makePlace({ address: '日本' }));
    const query = new URL(url).searchParams.get('query') ?? '';

    expect(query).toContain('Kameido Playground');
    expect(query).toContain('35.7041222,139.8194266');
    expect(query).not.toContain(' 日本');
  });

  it('omits broad locality labels from Google Maps searches', () => {
    const url = getGoogleMapsSearchUrl(makePlace({ address: 'Tokyo' }));
    const query = new URL(url).searchParams.get('query') ?? '';

    expect(query).toContain('Kameido Playground');
    expect(query).toContain('35.7041222,139.8194266');
    expect(query).not.toContain('Tokyo');
  });
});
