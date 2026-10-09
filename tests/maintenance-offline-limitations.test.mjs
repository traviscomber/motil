import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
test('offline UI does not claim the screen can reopen without a network connection', () => {
  const draft = readFileSync('components/maintenance/maintenance-offline-draft.tsx','utf8');
  const photos = readFileSync('components/maintenance/maintenance-offline-photos.tsx','utf8');
  const worker = readFileSync('public/sw.js','utf8');
  assert.match(worker, /event.respondWith\(fetch\(request\)\)/);
  assert.match(draft, /cerrarla o recargarla puede impedir reabrirla/);
  assert.match(photos, /Mantén abierta la OT si estás sin señal/);
  assert.match(draft, /journalText.length > 8000/);
  assert.match(draft, /Conflicto de sincronización/);
});
