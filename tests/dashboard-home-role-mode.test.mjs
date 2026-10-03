import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const home = await readFile(new URL('../components/dashboard/dashboard-home.tsx', import.meta.url), 'utf8');
const inbox = await readFile(new URL('../app/api/actions/inbox/route.ts', import.meta.url), 'utf8');

test('home resolves executive cargos and uses canonical module access as fallback', () => {
  assert.match(home, /gerente\|subgerente\|presidente/);
  assert.match(home, /jefe man\(\?:\\\.\|\\s\)/);
  assert.match(home, /hasModuleAccess\(moduleAccess, 'mant_gerencial', 'mant_operaciones'\)/);
  assert.match(home, /hasModuleAccess\(moduleAccess, 'prod_sondaje'/);
  assert.match(home, /hasModuleAccess\(moduleAccess, 'bodega_inventario'\)/);
  assert.match(home, /hasModuleAccess\(moduleAccess, 'fin_finanzas', 'fin_compras'\)/);
});

test('home only loads heavy domain overviews when the resolved mode needs them', () => {
  assert.match(home, /needsProduction \? '\/api\/produccion\/canonical-overview' : null/);
  assert.match(home, /needsMaintenance \? '\/api\/maintenance\/work-order-flow\?limit=200' : null/);
});

test('role inbox returns canonical role-matrix access with the profile', () => {
  assert.match(inbox, /\.from\('role_matrix'\)/);
  assert.match(inbox, /\.select\('module_key,access_level'\)/);
  assert.match(inbox, /moduleAccess,/);
});


test('home filters role shortcuts against canonical module access', () => {
  assert.match(home, /const SHORTCUT_MODULES: Record<string, string\[\]>/);
  assert.match(home, /if \(item\.key === 'actions' \|\| mode === 'management' \|\| !moduleAccess\) return true/);
  assert.match(home, /requiredModules\.some\(\(key\) => hasModuleAccess\(moduleAccess, key\)\)/);
  assert.match(home, /production: \['prod_operaciones', 'prod_sondaje', 'prod_geologia', 'prod_quimica', 'prod_topografia'\]/);
});
