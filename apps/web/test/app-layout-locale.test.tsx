import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('AppLayout language selector', () => {
  beforeEach(async () => {
    setPreference.mockClear();
    useAppStore.setState({ locale: 'ja' });
    await changeLocale('ja');
  });

  it('switches the chrome language and stores the selected locale', async () => {
    const router = createMemoryRouter([
      {
        path: '/',
        element: <AppLayout />,
        children: [{ index: true, element: <div /> }],
      },
    ]);

    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole('button', { name: '简体中文' }));

    await waitFor(() =>
      expect(
        screen.getByRole('link', { name: '个人中心' }),
      ).toBeInTheDocument(),
    );
    expect(useAppStore.getState().locale).toBe('zh-CN');
    expect(setPreference).toHaveBeenCalledWith({ locale: 'zh-CN' });
  });
});
