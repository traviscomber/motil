import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routeUrl = new URL('../app/api/intelligence/executive-assistant/route.ts', import.meta.url);
const source = await readFile(routeUrl, 'utf8');

test('executive supply reasoning uses the canonical cross-domain read model', () => {
  assert.match(source, /work_order_supply_chain_v1/);
  assert.match(source, /scope: 'maintenance_inventory_procurement'/);
  assert.match(source, /PROBLEMA → DEPENDENCIA OBSERVADA → ESLABÓN FALTANTE\/PENDIENTE → SIGUIENTE VALIDACIÓN HUMANA/);
});

test('full supply chain requires maintenance inventory and procurement access', () => {
  assert.match(source, /if \(canReadMaintenance && canReadInventory && canReadProcurement\)/);
  assert.match(source, /scope: 'maintenance_inventory_procurement'/);
});

test('inventory-only cross-domain evidence does not expose procurement columns', () => {
  const inventoryBlock = source.match(/else if \(canReadMaintenance && canReadInventory\) \{([\s\S]*?)\} else if \(canReadMaintenance && canReadProcurement\)/)?.[1] || '';
  assert.match(inventoryBlock, /material_shortage_count/);
  assert.doesNotMatch(inventoryBlock, /procurement_request_count/);
  assert.doesNotMatch(inventoryBlock, /procurement_order_count/);
  assert.doesNotMatch(inventoryBlock, /undelivered_order_count/);
});

test('procurement-only cross-domain evidence does not expose inventory fields', () => {
  const procurementBlock = source.match(/else if \(canReadMaintenance && canReadProcurement\) \{([\s\S]*?)\n    \}\n\n    if \(access\.canRead\('finance'\)\)/)?.[1] || '';
  assert.match(procurementBlock, /procurement_request_count/);
  assert.match(procurementBlock, /procurement_order_count/);
  assert.doesNotMatch(procurementBlock, /material_shortage_quantity/);
  assert.doesNotMatch(procurementBlock, /parts_installed/);
});

test('cross-domain reasoning stays read only and refuses hidden-domain inference', () => {
  assert.match(source, /No hay permiso de Compras en esta consulta: no inferir solicitud, orden, proveedor ni entrega/);
  assert.match(source, /No hay permiso de Inventario en esta consulta: no inferir stock, reserva, faltante físico ni disponibilidad de bodega/);
  assert.match(source, /No conviertas supply_chain_status en causa raíz/);
  assert.match(source, /No ejecutes acciones, no apruebes, no cierres, no compres, no ajustes stock y no cambies estados/);
  assert.doesNotMatch(source, /from\('work_order_supply_chain_v1'\)\s*\.update/);
  assert.doesNotMatch(source, /from\('work_order_supply_chain_v1'\)\s*\.insert/);
});

test('supply chain source remains traceable', () => {
  assert.match(source, /sources\.add\('work_order_supply_chain_v1'\)/);
  assert.match(source, /read_executive_supply_chain/);
});
