import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const ownerMigration = await readFile(
  new URL('../supabase/migrations/20261002225500_fix_drilling_freshness_owner.sql', import.meta.url),
  'utf8',
);
const slaMigration = await readFile(
  new URL('../supabase/migrations/20261002230000_preserve_drilling_freshness_sla.sql', import.meta.url),
  'utf8',
);
const inbox = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const freshnessPage = await readFile(
  new URL('../app/dashboard/produccion/actualizar-fuentes/page.tsx', import.meta.url),
  'utf8',
);
const masterImportPage = await readFile(
  new URL('../app/dashboard/produccion/importacion-maestra/page.tsx', import.meta.url),
  'utf8',
);

test('drilling freshness is owned by the drilling domain and JEFE SONDAJE', () => {
  assert.match(ownerMigration, /data_health:production:drilling_freshness/);
  assert.match(ownerMigration, /replace\(v_tail, '''plant''::text AS domain', '''drilling''::text AS domain'\)/);
  assert.match(ownerMigration, /replace\(v_tail, '''JEFE PLANTA''::text', '''JEFE SONDAJE''::text'\)/);
});

test('drilling freshness preserves the previous production SLA and escalation', () => {
  assert.match(slaMigration, /where domain = 'plant'/);
  assert.match(slaMigration, /'drilling'/);
  assert.match(slaMigration, /severity in \('critical', 'warning'\)/);
  assert.match(slaMigration, /on conflict \(domain, severity, responsibility\)/);
});

test('drilling freshness routes to the dedicated source workspace', () => {
  assert.match(inbox, /rawId === 'production' && rest\[0\] === 'drilling_freshness'/);
  assert.match(inbox, /actualizar-fuentes\?source=drilling/);
});


test('source freshness workspace focuses the source carried by the task route', () => {
  assert.match(freshnessPage, /useSearchParams/);
  assert.match(freshnessPage, /searchParams\.get\('source'\)/);
  assert.match(freshnessPage, /\['transport', 'plant', 'drilling'\]/);
  assert.match(freshnessPage, /sources\.filter\(\(source\) => source\.key === focusedSource\)/);
  assert.match(freshnessPage, /visibleSources\.map/);
});


test('master production import contextualizes transport and plant freshness tasks without weakening validation', () => {
  assert.match(masterImportPage, /useSearchParams/);
  assert.match(masterImportPage, /searchParams\.get\('dataHealth'\)/);
  assert.match(masterImportPage, /transport_freshness/);
  assert.match(masterImportPage, /plant_freshness/);
  assert.match(masterImportPage, /MASTER_SHA256/);
  assert.match(masterImportPage, /El mismo master canónico actualiza Transporte y Planta/);
  assert.match(masterImportPage, /no cambia la frescura/);
});
