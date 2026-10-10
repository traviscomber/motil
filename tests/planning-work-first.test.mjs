import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const source = await fs.readFile('app/dashboard/planificacion/page.tsx','utf8');
test('planning decisions precede collapsed indicators',()=>{
  assert.ok(source.indexOf('Qué va primero') < source.indexOf('data-testid="planning-more-indicators"'));
  assert.match(source,/Ver más · Indicadores de planificación/);
});
test('priority rows disclose sensor readings only on demand',()=>{
  const a=source.indexOf('<article key={item.source_row_id}');
  const b=source.indexOf('</article>',a);
  const row=source.slice(a,b);
  assert.match(row, /item.recommended_action/);
  assert.match(row, /<details/);
  assert.match(row, /<summary[^>]*>Ver detalles<\/summary>/);
  assert.ok(row.indexOf('item.current_reading') > row.indexOf('<details'));
  assert.match(row,/href="\/dashboard\/mantenimiento\/planificacion"/);
});
