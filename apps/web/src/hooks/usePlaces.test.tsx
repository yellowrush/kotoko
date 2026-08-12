import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { usePlacesFilters } from './usePlaces';

afterEach(() => cleanup());

function Harness() {
  const { filters, setMunicipality, setRailLine, setRadius } =
    usePlacesFilters();
  const location = useLocation();

  return (
    <div>
      <output data-testid="mode">{filters.locationMode}</output>
      <output data-testid="radius">{filters.radiusKm ?? ''}</output>
      <output data-testid="municipality">{filters.municipalityCode ?? ''}</output>
      <output data-testid="rail">{filters.railLineId ?? ''}</output>
      <output data-testid="place">{filters.placeId ?? ''}</output>
      <output data-testid="search">{location.search}</output>
      <button type="button" onClick={() => setMunicipality('13108')}>
        municipality
      </button>
      <button type="button" onClick={() => setRailLine('jr-sobu')}>
        rail
      </button>
      <button type="button" onClick={() => setRadius(5)}>
        radius
      </button>
    </div>
  );
}

describe('usePlacesFilters', () => {
  it('defaults the near mode radius to 3km', () => {
    render(
      <MemoryRouter initialEntries={['/places']}>
        <Harness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('near');
    expect(screen.getByTestId('radius')).toHaveTextContent('3');
  });

  it('parses location mode specific params', () => {
    render(
      <MemoryRouter
        initialEntries={['/places?mode=rail&rail=jr-sobu&radius=3&place=p1']}
      >
        <Harness />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mode')).toHaveTextContent('rail');
    expect(screen.getByTestId('rail')).toHaveTextContent('jr-sobu');
    expect(screen.getByTestId('radius')).toHaveTextContent('');
    expect(screen.getByTestId('place')).toHaveTextContent('p1');
  });

  it('clears conflicting location params when switching modes', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          '/places?category=park&mode=rail&rail=jr-sobu&place=p1',
        ]}
      >
        <Harness />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'municipality' }));

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? '';
      expect(search).toContain('category=park');
      expect(search).toContain('mode=municipality');
      expect(search).toContain('municipality=13108');
      expect(search).not.toContain('rail=');
      expect(search).not.toContain('place=');
    });
    expect(screen.getByTestId('rail')).toHaveTextContent('');
    expect(screen.getByTestId('place')).toHaveTextContent('');

    fireEvent.click(screen.getByRole('button', { name: 'radius' }));

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? '';
      expect(search).toContain('category=park');
      expect(search).toContain('radius=5');
      expect(search).not.toContain('mode=');
      expect(search).not.toContain('municipality=');
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('near');
  });
});
