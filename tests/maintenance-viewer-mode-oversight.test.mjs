import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const viewerMode = await fs.readFile('lib/maintenance/viewer-mode.ts', 'utf8');
const viewerContext = await fs.readFile('app/api/maintenance/viewer-context/route.ts', 'utf8');

test('cross-functional maintenance viewers resolve to oversight without inventing execution ownership', () => {
  assert.match(viewerMode, /cargo === 'gerente operaciones' \|\| cargo === 'jefe sostenibilidad'\) return 'oversight'/);
  assert.match(viewerMode, /cargo === 'jefe de planificación'\) return 'planning'/);
  assert.match(viewerMode, /cargo === 'jefe departamento de mantenimiento'\) return 'leadership'/);
  assert.match(viewerMode, /cargo\.startsWith\('mecánico'\)/);
});

test('viewer context preserves canonical cargo name for transversal and fallback views', () => {
  assert.match(viewerContext, /cargoName,\n\s+canEdit: access\.canWrite/);
  assert.doesNotMatch(viewerContext, /mode === 'general' \? null : cargoName/);
});


test('welder no longer inherits the mechanic phone execution mode', () => {
  assert.match(viewerMode, /cargo === 'soldador'\) return 'workshop'/);
  assert.match(viewerMode, /cargo\.startsWith\('mecánico'\)/);
});
