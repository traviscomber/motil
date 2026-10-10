import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const shellUrl = new URL('../components/production/geologia-workspace-shell.tsx', import.meta.url);
const canonicalStatusUrl = new URL('../components/production/geologia-canonical-status.tsx', import.meta.url);
const evidenceExceptionsUrl = new URL('../components/production/geologia-next-best-evidence.tsx', import.meta.url);
const productionLayoutUrl = new URL('../app/dashboard/produccion/layout.tsx', import.meta.url);
const drillingHomeUrl = new URL('../app/dashboard/produccion/sondaje/page.tsx', import.meta.url);

test('geology keeps decision views as local controls inside Production instead of a second navbar', async () => {
  const shell = await readFile(shellUrl, 'utf8');

  assert.match(shell, /<AreaNavigation label="Geología"/);
  assert.match(shell, /primary=\{navigationItems.slice\(0, 3\)\}/);
  assert.match(shell, /secondary=\{navigationItems.slice\(3\)\}/);
  assert.match(shell, /onSelect: \(\) => selectTab\(key\)/);
  assert.doesNotMatch(shell, /sticky top-0/);
  assert.doesNotMatch(shell, /Vistas principales de Geología/);
  assert.match(shell, /\['pending', 'Tareas'\]/);
  assert.match(shell, /\['corevision', 'CoreVision'\]/);
  assert.match(shell, /\['matrix', 'Matriz'\]/);
  assert.match(shell, /\['results', 'Resultados'\]/);
  assert.match(shell, /\['completeness', 'Cobertura'\]/);
  assert.match(shell, /\['priorities', 'Excepciones'\]/);
  assert.match(shell, /\['canonical', 'Estado'\]/);
  assert.doesNotMatch(shell, /\['priorities', 'Prioridades'\]/);
  assert.doesNotMatch(shell, /\['canonical', 'Fuentes'\]/);
});

test('Today contains operational work while evidence exceptions live under Evidence', async () => {
  const [shell, evidenceExceptions] = await Promise.all([
    readFile(shellUrl, 'utf8'),
    readFile(evidenceExceptionsUrl, 'utf8'),
  ]);

  const primary = shell.slice(shell.indexOf('const tabs ='), shell.indexOf("['corevision'"));
  assert.match(primary, /\['today', 'Resumen'\]/);
  assert.match(primary, /\['pending', 'Tareas'\]/);
  assert.match(primary, /\['holes', 'Ficha'\]/);
  assert.doesNotMatch(primary, /priorities|canonical/);
  assert.match(shell, /\['priorities', 'Excepciones'\]/);
  assert.match(evidenceExceptions, /Esta vista no es una cola de trabajo/);
  assert.match(evidenceExceptions, /Excepciones de evidencia/);
  assert.match(evidenceExceptions, /Sólo faltantes que vale la pena revisar/);
});

test('canonical State is traceability while actionable work has one home in Today Tasks', async () => {
  const [shell, canonicalStatus] = await Promise.all([
    readFile(shellUrl, 'utf8'),
    readFile(canonicalStatusUrl, 'utf8'),
  ]);

  assert.match(shell, /Estado = control y trazabilidad canónica/);
  assert.match(shell, /Toda acción operativa se atiende en Hoy → Tareas/);
  assert.match(shell, /Abrir tareas/);
  assert.match(shell, /selectTab\('pending'\)/);
  assert.match(canonicalStatus, /Estado por sondaje/);
  assert.match(canonicalStatus, /Las acciones operativas se atienden exclusivamente en Hoy → Tareas/);
  assert.match(canonicalStatus, /Condición \/ límite/);
  assert.doesNotMatch(canonicalStatus, /Tareas inmediatas para Geología/);
  assert.doesNotMatch(canonicalStatus, /Cola del geólogo/);
  assert.doesNotMatch(canonicalStatus, /Requiere atención/);
});

test('geology removes the redundant global summary and lets each context carry its own evidence', async () => {
  const shell = await readFile(shellUrl, 'utf8');

  assert.match(shell, /geologia-dashboard-simplified/);
  assert.match(shell, /geologia-dashboard-simplified section\[aria-label="Resumen geológico"\]/);
  assert.doesNotMatch(shell, /geologia-holes-focus section\[aria-label="Resumen geológico"\]/);
});

test('production uses one operational flow rail while keeping technical disciplines non-sequential', async () => {
  const [layout, drillingHome] = await Promise.all([
    readFile(productionLayoutUrl, 'utf8'),
    readFile(drillingHomeUrl, 'utf8'),
  ]);

  assert.match(layout, /label: 'Resumen'.*lane: 'flow'.*step: 1/);
  assert.match(layout, /label: 'Mina \/ Sector'.*lane: 'flow'.*step: 2/);
  assert.match(layout, /label: 'Perforación'.*lane: 'flow'.*step: 3/);
  assert.match(layout, /label: 'Transporte'.*lane: 'flow'.*step: 4/);
  assert.match(layout, /label: 'Planta \/ Metalurgia'.*lane: 'flow'.*step: 5/);
  assert.match(layout, /label: 'Geología'.*lane: 'technical'/);
  assert.match(layout, /label: 'Topografía'.*lane: 'technical'/);
  assert.match(layout, /label: 'Química'.*lane: 'technical'/);
  assert.match(layout, /<AreaNavigation label="Producción"/);
  assert.match(layout, /secondary=\{\[\.\.\.flowItems\.slice\(2\), \.\.\.technicalItems\]\}/);
  assert.doesNotMatch(layout, /Grupos de Producción/);
  assert.doesNotMatch(layout, /activeGroupKey/);
  assert.match(drillingHome, /mismo sondaje canónico/);
  assert.match(drillingHome, /no son dos bases de datos distintas/i);
  assert.match(drillingHome, /\/dashboard\/produccion\/geologia\?tab=holes/);
});