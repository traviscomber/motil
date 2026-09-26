import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const dict = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');
const mineriaPage = fs.readFileSync('app/mineria-chile/page.tsx', 'utf8');
const modulosPage = fs.readFileSync('app/modulos/[slug]/page.tsx', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');

const MODULE_SLUGS = ['produccion', 'mantenimiento', 'inventario', 'compras', 'finanzas', 'rrhh', 'sostenibilidad', 'legal'];

test('mineria-chile copy lives in the dictionary for both locales', () => {
  // es (matches the previously approved copy)
  assert.match(dict, /¿Qué es un Sistema Operativo para Minería\?/);
  assert.match(dict, /¿En qué se diferencia de un ERP minero\?/);
  assert.match(dict, /Sistema Operativo para Minería versus ERP minero/);
  assert.match(dict, /Preguntas sobre Sistemas Operativos para Minería/);
  assert.match(dict, /Transporte de Mineral, planta, metalurgia/);
  // en
  assert.match(dict, /What is a Mining Operating System\?/);
  assert.match(dict, /How is it different from a mining ERP\?/);
  assert.match(dict, /Mining Operating System vs mining ERP/);
  assert.match(dict, /Questions about Mining Operating Systems/);
  assert.match(dict, /Ore haulage, plant, metallurgy/);
});

test('all eight module pages are locale-aware in the dictionary', () => {
  for (const slug of MODULE_SLUGS) {
    assert.match(dict, new RegExp(`${slug}: \\{`), `missing module ${slug}`);
  }
  assert.match(dict, /Software de mantenimiento minero/);
  assert.match(dict, /Mining maintenance software/);
  assert.match(dict, /Ficha laboral 360°/);
  assert.match(dict, /360° work record/);
  assert.match(dict, /Contratos y cumplimiento para minería/);
  assert.match(dict, /Contracts and compliance for mining/);
});

test('SEO pages resolve the request locale and hardcode no copy', () => {
  for (const source of [mineriaPage, modulosPage]) {
    assert.match(source, /getDictionaryForRequest\(\)/);
    assert.match(source, /dict\.pages\./);
    assert.doesNotMatch(source, /Capacidades principales|Preguntas sobre/);
  }
  assert.match(mineriaPage, /FAQPage/);
  assert.match(mineriaPage, /application\/ld\+json/);
  assert.match(modulosPage, /BreadcrumbList/);
});

test('hreflang alternates declared on home, mineria-chile and module pages', () => {
  for (const source of [layout, mineriaPage, modulosPage]) {
    assert.match(source, /languages: \{ 'es-CL':[\s\S]*?en:[\s\S]*?'x-default'/);
  }
});
