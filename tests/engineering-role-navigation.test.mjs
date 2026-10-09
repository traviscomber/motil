import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sidebar = await readFile(new URL('../components/layout/sidebar.tsx', import.meta.url), 'utf8');
const home = await readFile(new URL('../components/dashboard/dashboard-home.tsx', import.meta.url), 'utf8');

test('Topography-only users get one authorized entrypoint instead of a denied Production page',()=>{
  assert.match(sidebar,/enforced&&item.itemKey==='production'&&!canView\('prod_operaciones'\)&&canView\('prod_topografia'\)/);
  assert.match(sidebar,/href:'\/dashboard\/produccion\/topografia'/);
  assert.match(sidebar,/locale==='en'\?'Topography':'Topografía'/);
  assert.match(sidebar,/item.itemKey==='production'&&item.href==='\/dashboard\/produccion\/topografia'/);
});
test('engineering home shortcuts point to role-authorized workspaces',()=>{
  const block=home.slice(home.indexOf("if (mode === 'engineering')"),home.indexOf("if (mode === 'mine')"));
  assert.match(block,/Topografía y plan/);
  assert.match(block,/href: '\/dashboard\/produccion\/topografia'/);
  assert.match(block,/href: '\/dashboard\/acciones'/);
  assert.doesNotMatch(block,/href: '\/dashboard\/produccion'/);
  assert.doesNotMatch(block,/href: '\/dashboard\/produccion\/inteligencia'/);
});
test('scoped engineering and mine roles avoid global domain summaries',()=>{
  assert.match(home,/mode !== 'engineering' && mode !== 'mine'/);
  assert.match(home,/needsBroadData \? '\/api\/produccion\/canonical-overview' : null/);
  assert.match(home,/needsBroadData \? '\/api\/maintenance\/work-order-flow\?limit=200' : null/);
});
test('empty engineering inbox never falsely implies all work is finished',()=>{
  assert.match(home,/Sin tareas registradas en Ingeniería/);
  assert.match(home,/La bandeja vacía no acredita cumplimiento del plan ni ausencia de brechas técnicas/);
});
