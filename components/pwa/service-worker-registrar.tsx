'use client';

import { useEffect } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type MotilInstallWindow = Window & {
  __motilInstallPrompt?: BeforeInstallPromptEvent | null;
};

export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    const motilWindow = window as MotilInstallWindow;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      motilWindow.__motilInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event('motil-install-prompt-ready'));
    };

    const onInstalled = () => {
      motilWindow.__motilInstallPrompt = null;
      window.dispatchEvent(new Event('motil-app-installed'));
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (cancelled) return;

        await registration.update().catch(() => undefined);

        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } catch (error) {
        console.error('[pwa] Service worker registration failed', error);
      }
    };

    void register();

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return null;
}
