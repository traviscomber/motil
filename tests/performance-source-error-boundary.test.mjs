import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/desempeno/page.tsx', import.meta.url);

test('performance clears stale selection evidence and preserves unavailable-source state instead of zero KPIs', async () => {
  const page = await readFile(pageUrl, 'utf8');

  assert.match(page, /setPayload\(null\);/);
  assert.match(page, /credentials: 'include'/);
  assert.match(page, /const unavailable = Boolean\(error\) && !payload/);
  assert.match(page, /loading \|\| unavailable \? '—' : rows\.length/);
  assert.match(page, /No hay una lectura válida para esta selección mientras la fuente esté en error/);
  assert.match(page, /\{person\.fullName \|\| 'La persona seleccionada'\} ve los KPIs disponibles/);
  assert.doesNotMatch(page, /Pedro Zegers ve todos los KPIs/);
});
