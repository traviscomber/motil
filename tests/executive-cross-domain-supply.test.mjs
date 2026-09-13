import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url);
const source = await readFile(routeUrl, 'utf8');

test('executive assistant reads canonical work order supply chain only when maintenance and supply access intersect', () => {
  assert.match(source, /access\.canRead\('maintenance'\) && \(access\.canRead\('inventory'\) \|\| access\.canRead\('procurement'\)\)/);
  assert.match(source, /from\('work_order_supply_chain_v1'\)/);
  assert.match(source, /\.eq\('organization_id', org\)/);
});

test('cross-domain supply evidence is read only and bounded to operational attention states', () => {
  assert.match(source, /shortage_without_request/);
  assert.match(source, /waiting_procurement/);
  assert.match(source, /waiting_delivery/);
  assert.match(source, /waiting_installation/);
  assert.doesNotMatch(source, /from\('work_order_supply_chain_v1'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('work_order_supply_chain_v1'\)\s*\.insert/);
});

test('executive reasoning keeps supply state distinct from root cause and authority', () => {
  assert.match(source, /supply_chain_status describe el punto observable de la cadena; no prueba causa raíz ni autoriza una acción/);
  assert.match(source, /No conviertas supply_chain_status en causa raíz/);
  assert.match(source, /No ejecutes acciones, no apruebes, no cierres, no compres, no ajustes stock y no cambies estados/);
});

test('supply chain source is included in traceability refs', () => {
  assert.match(source, /sources\.add\('work_order_supply_chain_v1'\)/);
  assert.match(source, /read_executive_supply_chain/);
});
