import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const inbox = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');
const health = await readFile(new URL('../app/dashboard/calidad-datos/salud/page.tsx', import.meta.url), 'utf8');
const financeExceptions = await readFile(new URL('../app/dashboard/finanzas/excepciones/page.tsx', import.meta.url), 'utf8');

test('role inbox deep-links data health to a focused health domain', () => {
  assert.match(inbox, /kind === 'data_health'/);
  assert.match(inbox, /calidad-datos\/salud\?domain=/);
  assert.match(health, /useSearchParams/);
  assert.match(health, /Acción abierta desde Mis acciones/);
});

test('finance quality tasks route to the canonical exception workspace', () => {
  assert.match(inbox, /missing_cost_centers/);
  assert.match(inbox, /zero_amount_lines/);
  assert.match(inbox, /source_warning_lines/);
  assert.match(inbox, /finance.*validation|validation.*finance/s);
  assert.match(inbox, /dashboard\/finanzas\/excepciones\?issue=/);
  assert.match(inbox, /treasury_missing_due_date[\s\S]*dashboard\/finanzas\/pagos/);
  assert.match(financeExceptions, /Excepciones financieras/);
  assert.match(financeExceptions, /Ejecutar validación/);
  assert.match(financeExceptions, /Esta vista no corrige ni sobrescribe filas/);
});
