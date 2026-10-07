'use client';

import { useEffect } from 'react';

export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        if (cancelled) return;

        // Pick up a newly deployed worker without requiring the user to
        // manually clear Chrome data or reinstall the app.
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
    };
  }, []);

  return null;
}
