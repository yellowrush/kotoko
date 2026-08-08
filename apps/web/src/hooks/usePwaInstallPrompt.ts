import { useCallback, useEffect, useState } from 'react';

function isStandaloneDisplayMode() {
  return typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true;
}

export function usePwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplayMode());

  useEffect(() => {
    function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      if (!isStandaloneDisplayMode()) {
        setInstalled(false);
        setPromptEvent(event);
      }
    }

    function handleAppInstalled() {
      setInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!promptEvent) return;

    const event = promptEvent;
    setPromptEvent(null);
    await event.prompt();
    await event.userChoice.catch(() => undefined);
  }, [promptEvent]);

  return {
    canInstall: Boolean(promptEvent) && !installed,
    install,
  };
}
