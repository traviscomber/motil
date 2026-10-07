import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const manifest = await readFile(new URL('../app/manifest.ts', import.meta.url), 'utf8');
const layout = await readFile(new URL('../app/layout.tsx', import.meta.url), 'utf8');
const installer = await readFile(new URL('../components/pwa/install-motil-button.tsx', import.meta.url), 'utf8');
const sidebar = await readFile(new URL('../components/layout/sidebar.tsx', import.meta.url), 'utf8');
const iconRoute = await readFile(new URL('../app/api/pwa/icon-192/route.tsx', import.meta.url), 'utf8');

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
  assert.match(iconRoute, /icon-512\.png/);
});
