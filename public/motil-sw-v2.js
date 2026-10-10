const MOTIL_SW_VERSION = 'motil-pwa-v2';
const OFFLINE_SHELL_CACHE = 'motil-offline-shell-v1';
const OFFLINE_SHELL_URL = '/offline-maintenance.html';
const LEGACY_CACHES = new Set([
  'sostenibilidad-v2',
  'sostenibilidad-api-v2',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(OFFLINE_SHELL_CACHE).then((cache) => cache.add(OFFLINE_SHELL_URL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => LEGACY_CACHES.has(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate' && /^\\/dashboard\\/mantenimiento\\/ordenes-trabajo\\/[0-9a-f-]{36}\\/?$/i.test(url.pathname)) {
    event.respondWith(fetch(request).catch(async () => {
      const cache = await caches.open(OFFLINE_SHELL_CACHE);
      return (await cache.match(OFFLINE_SHELL_URL)) || Response.error();
    }));
    return;
  }
  event.respondWith(fetch(request));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage?.({ type: 'MOTIL_SW_VERSION', version: MOTIL_SW_VERSION });
  }
});
