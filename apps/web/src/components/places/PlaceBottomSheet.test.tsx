import { beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { i18n, initI18n } from '../../app/i18n';
import { PlaceBottomSheet } from './PlaceBottomSheet';
import type { FilteredPlace } from '../../lib/placeFilters';

const place = (overrides: Partial<FilteredPlace> = {}): FilteredPlace => ({
  id: 'p1',
  name: 'Ueno Park',
  category: 'park',
  latitude: 35.7148,
  longitude: 139.773,
  address: 'Tokyo',
  municipalityCode: '13106',
  indoorOutdoor: 'outdoor',
  status: 'published',
  media: [],
  labels: [],
  provenance: [],
  version: 1,
  distanceKm: 1.2,
  ageSuitable: true,
  ...overrides,
});

beforeAll(async () => {
  await initI18n();
});

describe('PlaceBottomSheet', () => {
  it('renders a clean nearby list title and a compact independent detail link', () => {
    const onSelect = vi.fn();

    render(
      <MemoryRouter>
        <PlaceBottomSheet
          places={[place()]}
          selectedPlaceId={undefined}
          collapsed={false}
          onToggleCollapsed={vi.fn()}
          onSelect={onSelect}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(i18n.t('places.spotsNear'))).toBeInTheDocument();
    expect(
      screen.queryByText(i18n.t('common.details')),
    ).not.toBeInTheDocument();

    const selectButton = screen.getByText('Ueno Park').closest('button');
    expect(selectButton).not.toBeNull();
    fireEvent.click(selectButton!);
    expect(onSelect).toHaveBeenCalledWith('p1');

    const detailLink = screen.getByRole('link', {
      name: `${i18n.t('common.details')}: Ueno Park`,
    });
    expect(detailLink).toHaveClass('h-11');
    expect(detailLink).toHaveClass('w-11');
    expect(detailLink).toHaveClass('shrink-0');
    expect(detailLink).toHaveAttribute('href', '/places/p1');
  });
});
