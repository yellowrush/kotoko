import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { changeLocale, i18n, initI18n } from '../src/app/i18n';
import { PwaInstallButton } from '../src/components/PwaInstallButton';

const originalMatchMedia = window.matchMedia;

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function createBeforeInstallPromptEvent() {
  const prompt = vi.fn(() => Promise.resolve());
  const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;

  Object.defineProperty(event, 'platforms', { value: ['web'] });
  Object.defineProperty(event, 'prompt', { value: prompt });
  Object.defineProperty(event, 'userChoice', {
    value: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
  });

  return { event, prompt };
}

beforeAll(async () => {
  await initI18n();
});

describe('PwaInstallButton', () => {
  beforeEach(async () => {
    mockMatchMedia(false);
    await changeLocale('ja');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('stays hidden before the browser exposes an install prompt', () => {
    render(<PwaInstallButton />);

    expect(screen.queryByRole('button', { name: i18n.t('common.installApp') })).not.toBeInTheDocument();
  });

  it('shows after beforeinstallprompt and starts the browser install flow', async () => {
    const { event, prompt } = createBeforeInstallPromptEvent();

    render(<PwaInstallButton />);

    fireEvent(window, event);

    const button = await screen.findByRole('button', { name: i18n.t('common.installApp') });
    fireEvent.click(button);

    expect(prompt).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: i18n.t('common.installApp') })).not.toBeInTheDocument(),
    );
  });

  it('hides when the app has been installed', async () => {
    const { event } = createBeforeInstallPromptEvent();

    render(<PwaInstallButton />);

    fireEvent(window, event);
    expect(await screen.findByRole('button', { name: i18n.t('common.installApp') })).toBeInTheDocument();

    fireEvent(window, new Event('appinstalled'));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: i18n.t('common.installApp') })).not.toBeInTheDocument(),
    );
  });

  it('does not show while already running as an installed app', () => {
    mockMatchMedia(true);
    const { event } = createBeforeInstallPromptEvent();

    render(<PwaInstallButton />);

    fireEvent(window, event);

    expect(screen.queryByRole('button', { name: i18n.t('common.installApp') })).not.toBeInTheDocument();
  });
});
