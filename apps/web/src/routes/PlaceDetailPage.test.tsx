import { cleanup, render, screen } from '@testing-library/react';
import type { Place } from '@kodoko/domain';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { i18n, initI18n } from '../app/i18n';
import { PlaceDetailPage } from './PlaceDetailPage';

const mockUsePlace = vi.fn();

vi.mock('../hooks/usePlaces', () => ({
  usePlace: (...args: unknown[]) => mockUsePlace(...args),
}));

vi.mock('../hooks/useFavorites', () => ({
  useFavorites: () => ({
    favoriteIds: new Set<string>(),
    loading: false,
    toggle: vi.fn(),
  }),
}));

vi.mock('../hooks/usePlaceVisits', () => ({
  usePlaceVisit: () => ({
    visits: [],
    latestVisit: null,
    loading: false,
    recordToday: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock('../hooks/useActiveChild', () => ({
  useActiveChild: () => ({
    children: [],
    active: null,
    loading: false,
    setActive: vi.fn(),
  }),
}));

vi.mock('../hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    status: 'idle',
    coords: null,
    requested: false,
    request: vi.fn(),
  }),
}));

vi.mock('../hooks/useWeather', () => ({
  useWeather: () => ({ data: null }),
}));

vi.mock('../components/RecommendationReasons', () => ({
  RecommendationReasons: () => <div data-testid="recommendation-reasons" />,
}));

vi.mock('../components/places/PlaceBasicInfo', () => ({
  PlaceBasicInfo: () => <section data-testid="basic-info" />,
}));

vi.mock('../components/places/PlaceReservationSection', () => ({
  PlaceReservationSection: () => <section data-testid="reservation" />,
}));

vi.mock('../components/places/PlaceComments', () => ({
  PlaceComments: () => <section data-testid="comments" />,
}));

vi.mock('../components/places/PlaceReportDialog', () => ({
  PlaceReportDialog: () => null,
}));

vi.mock('../components/places/PlaceShareButton', () => ({
  PlaceShareButton: () => <button type="button">share</button>,
}));

function makePlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'osm-playground-8b67993b',
    name: '亀戸三丁目第3児童遊園',
    category: 'playground',
    latitude: 35.7041222,
    longitude: 139.8194266,
    address: '東京都江東区亀戸3-12-10',
    municipalityCode: '13108',
    indoorOutdoor: 'outdoor',
    status: 'published',
    websiteUrl: 'https://www.city.koto.lg.jp/470601/shisetsuannai/kokyo/koen/jidokoen/16566.html',
    sourceUrl: 'https://www.city.koto.lg.jp/470601/shisetsuannai/kokyo/koen/jidokoen/16566.html',
    media: [],
    labels: [],
    provenance: [],
    version: 1,
    ...overrides,
  };
}

function renderDetail(place: Place) {
  mockUsePlace.mockReturnValue({
    data: place,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });

  render(
    <MemoryRouter initialEntries={[`/places/${place.id}`]}>
      <Routes>
        <Route path="/places/:placeId" element={<PlaceDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeAll(async () => {
  await initI18n();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlaceDetailPage media actions', () => {
  it('puts the Google Maps icon button before the official site button when public media is missing', () => {
    renderDetail(makePlace());

    const googleMapsLink = screen.getByRole('link', {
      name: i18n.t('places.googleMapsPhotos'),
    });
    const officialSiteLink = screen.getByRole('link', {
      name: i18n.t('places.officialSite'),
    });

    expect(googleMapsLink).toHaveAttribute(
      'href',
      expect.stringContaining('google.com/maps/search'),
    );
    expect(googleMapsLink).toHaveClass('h-12', 'w-12');
    expect(screen.queryByText(i18n.t('places.googleMapsPhotos'))).not.toBeInTheDocument();
    expect(
      googleMapsLink.compareDocumentPosition(officialSiteLink) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('does not show the Google Maps photo button when public media exists', () => {
    renderDetail(
      makePlace({
        media: [
          {
            id: 'real-photo',
            type: 'image',
            url: 'https://example.com/place.jpg',
            alt: 'real photo',
            credit: 'Official site',
            license: 'official-site-image',
            sourceUrl: 'https://example.com',
            cover: true,
          },
        ],
      }),
    );

    expect(
      screen.queryByRole('link', {
        name: i18n.t('places.googleMapsPhotos'),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: i18n.t('places.officialSite') }),
    ).toBeInTheDocument();
  });
});
