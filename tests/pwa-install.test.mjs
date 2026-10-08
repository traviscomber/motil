import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = await readFile(new URL('../app/manifest.ts', import.meta.url), 'utf8');
const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const installer = await readFile(new URL('../components/pwa/install-motil-button.tsx', import.meta.url), 'utf8');
const sidebar = await readFile(new URL('../components/layout/sidebar.tsx', import.meta.url), 'utf8');
const iconRoute = await readFile(new URL('../app/api/pwa/icon-192/route.tsx', import.meta.url), 'utf8');
const registrar = await readFile(new URL('../components/pwa/service-worker-registrar.tsx', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../public/motil-sw-v2.js', import.meta.url), 'utf8');
const nextConfig = await readFile(new URL('../next.config.js', import.meta.url), 'utf8');

test('MOTIL exposes an installable standalone web app manifest', () => {
  assert.match(manifest, /name: 'MOTIL Mining OS'/);
  assert.match(manifest, /short_name: 'MOTIL'/);
  assert.match(manifest, /start_url: '\/dashboard'/);
  assert.match(manifest, /display: 'standalone'/);
  assert.match(manifest, /sizes: '192x192'/);
  assert.match(manifest, /sizes: '512x512'/);
  assert.match(layout, /manifest: '\/manifest\.webmanifest'/);
  assert.match(layout, /appleWebApp/);
});

test('MOTIL install control supports Chromium prompts and Apple home-screen guidance', () => {
  assert.match(installer, /beforeinstallprompt/);
  assert.match(installer, /appinstalled/);
  assert.match(installer, /display-mode: standalone/);
  assert.match(installer, /Agregar a Inicio/);
  assert.match(installer, /Abrir como app web/);
  assert.match(installer, /Instalar app o Agregar a pantalla principal/);
  assert.match(sidebar, /InstallMotilButton locale=\{locale\}/);
});

test('MOTIL provides the required 192px install icon alongside the existing 512px icon', () => {
  assert.match(iconRoute, /width: 192/);
  assert.match(iconRoute, /height: 192/);
  assert.match(iconRoute, /<path/);
  assert.doesNotMatch(iconRoute, /icon-512\.png/);
});


test('MOTIL registers a root-scoped service worker required by Chrome Android installability', () => {
  assert.match(layout, /PwaServiceWorkerRegistrar/);
  assert.match(layout, /mobile-web-app-capable/);
  assert.match(registrar, /navigator\.serviceWorker\.register\('\/motil-sw-v2\.js'/);
  assert.match(registrar, /scope: '\/'/);
  assert.match(registrar, /updateViaCache: 'none'/);
});

test('MOTIL service worker stays network-authoritative and removes only legacy sustainability caches', () => {
  assert.match(serviceWorker, /self\.addEventListener\('install'/);
  assert.match(serviceWorker, /self\.addEventListener\('activate'/);
  assert.match(serviceWorker, /self\.addEventListener\('fetch'/);
  assert.match(serviceWorker, /event\.respondWith\(fetch\(request\)\)/);
  assert.match(serviceWorker, /sostenibilidad-v2/);
  assert.match(serviceWorker, /sostenibilidad-api-v2/);
  assert.doesNotMatch(serviceWorker, /cache\.put/);
  assert.doesNotMatch(serviceWorker, /caches\.open/);
});


test('PWA control files are never cached as immutable at the edge', () => {
  assert.match(nextConfig, /source: '\/motil-sw-v2\.js'/);
  assert.match(nextConfig, /Service-Worker-Allowed/);
  assert.match(nextConfig, /source: '\/manifest\.webmanifest'/);
  assert.match(nextConfig, /no-store, no-cache, must-revalidate/);
  assert.doesNotMatch(nextConfig, /source: '\/:path\*'[\s\S]{0,1500}max-age=31536000, immutable/);
});

test('Android install prompt is captured globally before the sidebar button mounts', () => {
  assert.match(registrar, /__motilInstallPrompt/);
  assert.match(registrar, /motil-install-prompt-ready/);
  assert.match(installer, /__motilInstallPrompt/);
  assert.match(installer, /motil-install-prompt-ready/);
});


test('Android migrates away from stale legacy service worker registrations', () => {
  assert.match(registrar, /getRegistrations\(\)/);
  assert.match(registrar, /endsWith\('\/sw\.js'\)/);
  assert.match(registrar, /registration\.unregister\(\)/);
  assert.match(registrar, /motil-sw-v2\.js/);
  assert.match(serviceWorker, /MOTIL_SW_VERSION = 'motil-pwa-v2'/);
});


test('PWA icons use canonical MOTIL artwork instead of legacy v0 assets', () => {
  assert.match(manifest, /\/api\/pwa\/icon-192\?v=motil-2/);
  assert.match(manifest, /\/api\/pwa\/motil-icon-512\?v=motil-2/);
  assert.doesNotMatch(manifest, /src: '\/icon-512\.png'/);
  assert.match(layout, /motil-icon-512\?v=motil-2/);
  assert.match(iconRoute, /<path/);
  assert.doesNotMatch(iconRoute, /icon-512\.png/);
});
