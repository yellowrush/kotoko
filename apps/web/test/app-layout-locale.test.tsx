import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../src/components/AppLayout';
import { changeLocale, initI18n } from '../src/app/i18n';
import { useAppStore } from '../src/store/appStore';

const setPreference = vi.fn(async () => undefined);

vi.mock('../src/lib/db', () => ({
  getPreferenceRepository: () => ({
    set: setPreference,
  }),
}));

beforeAll(async () => {
  await initI18n();
});

describe('AppLayout locale behavior', () => {
  beforeEach(async () => {
    setPreference.mockClear();
    useAppStore.setState({ locale: 'ja' });
    await changeLocale('ja');
  });

  it('does not render the header language dropdown while keeping Japanese fixed', () => {
    useAppStore.setState({ locale: 'zh-CN' });

    const router = createMemoryRouter([
      {
        path: '/',
        element: <AppLayout />,
        children: [{ index: true, element: <div /> }],
      },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.queryByLabelText('言語')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('语言')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('語言')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'お気に入り' })).toBeInTheDocument();
    expect(setPreference).not.toHaveBeenCalled();
  });
});
