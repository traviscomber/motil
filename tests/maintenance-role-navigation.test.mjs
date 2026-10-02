import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const layout = await fs.readFile('app/dashboard/mantenimiento/layout.tsx', 'utf8');

test('maintenance navigation simplifies progressively by role', () => {
  assert.match(layout, /planning:\s*\{[\s\S]*flow:\s*\['Planificar', 'Órdenes'\][\s\S]*support:\s*\['Resumen', 'Activos', 'Fuentes'\]/);
  assert.match(layout, /execution:\s*\{[\s\S]*flow:\s*\[\][\s\S]*support:\s*\['Resumen'\]/);
  assert.match(layout, /leadership:\s*\{[\s\S]*flow:\s*\['Planificar', 'Órdenes', 'Cierre'\][\s\S]*support:\s*\['Resumen', 'Activos', 'Indicadores', 'Fuentes'\]/);
});

test('role-aware maintenance navigation derives from viewer context', () => {
  assert.match(layout, /\/api\/maintenance\/viewer-context/);
  assert.match(layout, /visibleFlowItems/);
  assert.match(layout, /visibleSupportItems/);
});
