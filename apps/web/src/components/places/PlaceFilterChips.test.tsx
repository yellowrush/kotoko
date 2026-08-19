import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { i18n, initI18n } from '../../app/i18n';
import { PlaceFilterChips } from './PlaceFilterChips';
import type { PlacesFilterState } from '../../hooks/usePlaces';

const baseFilters: PlacesFilterState = {
  locationMode: 'near',
  category: undefined,
  indoorOutdoor: undefined,
  tags: [],
  radiusKm: 3,
  municipalityCode: undefined,
  railLineId: undefined,
  placeId: undefined,
  query: undefined,
};

beforeAll(async () => {
  await initI18n();
});

afterEach(() => {
  cleanup();
});

function renderFilter(overrides: Partial<PlacesFilterState>) {
  const props = {
    filters: { ...baseFilters, ...overrides },
    municipalityCounts: { '13108': 2, '13109': 1 },
    railLineCounts: { 'jr-sobu': 2, 'toden-arakawa': 1 },
    open: true,
    onOpenChange: vi.fn(),
    setCategory: vi.fn(),
    setIndoorOutdoor: vi.fn(),
    setLocationMode: vi.fn(),
    setRadius: vi.fn(),
    setMunicipality: vi.fn(),
    setRailLine: vi.fn(),
    toggleTag: vi.fn(),
  };

  render(<PlaceFilterChips {...props} />);
  return props;
}

describe('PlaceFilterChips location modes', () => {
  it('renders location modes as a full-width segmented tab control with icons', () => {
    const props = renderFilter({ locationMode: 'municipality' });

    const locationGroup = screen.getByRole('radiogroup', {
      name: i18n.t('places.filters.sectionLocation'),
    });
    const near = within(locationGroup).getByRole('radio', {
      name: i18n.t('places.filters.locationModes.near'),
    });
    const municipality = within(locationGroup).getByRole('radio', {
      name: i18n.t('places.filters.locationModes.municipality'),
    });
    const rail = within(locationGroup).getByRole('radio', {
      name: i18n.t('places.filters.locationModes.rail'),
    });

    expect(near.parentElement).toHaveClass('grid', 'w-full', 'grid-cols-3');
    expect(within(locationGroup).getAllByRole('radio')).toHaveLength(3);
    expect(near).toHaveAttribute('aria-checked', 'false');
    expect(municipality).toHaveAttribute('aria-checked', 'true');
    expect(rail).toHaveAttribute('aria-checked', 'false');
    expect(municipality.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(municipality.querySelector('span')).toHaveClass('whitespace-nowrap');

    fireEvent.click(municipality);
    expect(props.setLocationMode).not.toHaveBeenCalled();

    fireEvent.click(rail);
    expect(props.setLocationMode).toHaveBeenCalledWith('rail');
  });

  it('renders radius as a 1-20km slider with the unit beside the value', () => {
    const props = renderFilter({ locationMode: 'near', radiusKm: 3 });

    const slider = screen.getByRole('slider', {
      name: i18n.t('places.filters.sectionRadius'),
    });

    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '20');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('3');
    expect(screen.getByText(`3 ${i18n.t('places.filters.radiusUnit')}`)).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(screen.queryByText('20km')).not.toBeInTheDocument();

    fireEvent.change(slider, { target: { value: '12' } });
    expect(props.setRadius).toHaveBeenCalledWith(12);
  });

  it('renders common and all municipality chips with counts', () => {
    const props = renderFilter({ locationMode: 'municipality' });

    const koto = screen.getByRole('button', { name: /江東区/ });
    expect(koto).toHaveTextContent('2');
    fireEvent.click(koto);

    expect(props.setMunicipality).toHaveBeenCalledWith('13108');
  });

  it('renders rail lines grouped by operator family', () => {
    const props = renderFilter({ locationMode: 'rail' });

    expect(screen.getByText('JR')).toBeInTheDocument();
    expect(screen.getByText('私鉄・その他')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /JR総武線/ }));
    expect(props.setRailLine).toHaveBeenCalledWith('jr-sobu');
  });

  it('renders the time-limited events toggle under tags', () => {
    const props = renderFilter({});

    const toggle = screen.getByRole('button', {
      name: i18n.t('places.timeLimitedEvents'),
    });
    expect(toggle).toHaveTextContent(i18n.t('places.timeLimitedEvents'));
    expect(toggle).not.toHaveClass('bg-brand-600');

    fireEvent.click(toggle);
    expect(props.setCategory).toHaveBeenCalledWith('event');
  });

  it('shows the time-limited events toggle active when the event category is selected', () => {
    renderFilter({ category: 'event' });

    const toggle = screen.getByRole('button', {
      name: i18n.t('places.timeLimitedEvents'),
    });
    expect(toggle).toHaveClass('bg-brand-600');

    fireEvent.click(toggle);
  });
});
