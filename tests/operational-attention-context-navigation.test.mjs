import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const navUrl = new URL('../components/layout/operational-attention-context-nav.tsx', import.meta.url);
const shellUrl = new URL('../components/layout/dashboard-shell.tsx', import.meta.url);
const alertsUrl = new URL('../app/dashboard/alertas/page.tsx', import.meta.url);
const problemsUrl = new URL('../app/dashboard/andon/page.tsx', import.meta.url);
const leanUrl = new URL('../app/dashboard/lean/page.tsx', import.meta.url);

test('Atención operacional separates alert signals from managed problems', async () => {
  const source = await readFile(navUrl, 'utf8');
  const dict = await readFile(new URL('../lib/i18n/dictionaries.ts', import.meta.url), 'utf8');
  assert.match(source, /href: '\/dashboard\/alertas'/);
  assert.match(source, /href: '\/dashboard\/andon'/);
  assert.match(dict, /alerts: 'Alertas'/);
  assert.match(dict, /andon: 'Problemas'/);
  assert.doesNotMatch(source, /step:/);
});

test('shared operational attention context is mounted once in the dashboard shell', async () => {
  const source = await readFile(shellUrl, 'utf8');
  assert.match(source, /<OperationalAttentionContextNav dictionary=\{dictionary\} \/>/);
});

test('alerts remain signals while Andon owns the operational problem lifecycle', async () => {
  const alerts = await readFile(alertsUrl, 'utf8');
  const problems = await readFile(problemsUrl, 'utf8');

  assert.match(alerts, /Centro de alertas/);
  assert.match(alerts, /\/api\/alertas/);
  assert.match(problems, /Problemas operacionales/);
  assert.match(problems, /Las alertas son señales/);
  assert.match(problems, /\/api\/lean\/andon/);
  assert.match(problems, /inventario: 'Bodega'/);
  assert.doesNotMatch(problems, /<PageHeaderTitle>Alertas operacionales<\/PageHeaderTitle>/);
});

test('management center uses problem language for Andon data', async () => {
  const source = await readFile(leanUrl, 'utf8');
  assert.match(source, /label: 'Problemas abiertos'.*href: '\/dashboard\/andon'/);
  assert.match(source, /action: 'Abrir problemas'/);
  assert.match(source, /Problemas abiertos ordenados por antigüedad/);
  assert.match(source, /title="Cargando problemas"/);
  assert.match(source, /title="Sin problemas abiertos"/);
  assert.doesNotMatch(source, /label: 'Alertas abiertas'/);
  assert.doesNotMatch(source, /action: 'Abrir alertas'/);
});
