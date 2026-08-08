import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { UserPreference } from '@kodoko/domain';
import { initI18n } from '../src/app/i18n';
import { SettingsPage } from '../src/routes/SettingsPage';

const preferenceStore = vi.hoisted(() => ({
  current: {
    id: 'default',
    locale: 'ja',
    municipalityCode: '13106',
    updatedAt: '2026-01-01T00:00:00.000Z',
  } as UserPreference | null,
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('../src/lib/db', () => ({
  getPreferenceRepository: () => ({
    get: preferenceStore.get,
    set: preferenceStore.set,
  }),
}));

beforeAll(async () => {
  await initI18n();
});

describe('SettingsPage recommendation preferences', () => {
  beforeEach(() => {
    preferenceStore.current = {
      id: 'default',
      locale: 'ja',
      municipalityCode: '13106',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    preferenceStore.get.mockImplementation(async () => preferenceStore.current);
    preferenceStore.set.mockImplementation(async (input: Partial<UserPreference>) => {
      preferenceStore.current = {
        id: 'default',
        locale: 'ja',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...preferenceStore.current,
        ...input,
      };
      return preferenceStore.current;
    });
  });

  it('saves and reloads radius and indoor/outdoor preferences', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    const fiveKm = await screen.findByRole('button', { name: '5km' });
    fireEvent.click(fiveKm);

    await waitFor(() => expect(preferenceStore.set).toHaveBeenCalledWith({ radiusKm: 5 }));
    expect(fiveKm).toHaveClass('bg-brand-600');

    const indoor = screen.getByRole('button', { name: '屋内' });
    fireEvent.click(indoor);

    await waitFor(() =>
      expect(preferenceStore.set).toHaveBeenCalledWith({ indoorOutdoorPreference: 'indoor' }),
    );
    expect(indoor).toHaveClass('bg-brand-600');
  });
});
