import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const home = fs.readFileSync('components/dashboard/home-decision-priorities.tsx', 'utf8');

test('home keeps priorities and temporal changes as separate surfaces', () => {
  assert.match(home, /decision-cases\/prioritized\?limit=3/);
  assert.match(home, /decision-cases\/changes\?hours=24/);
  assert.match(home, /Qué requiere atención/);
  assert.match(home, /Cambió desde ayer/);
  assert.match(home, /slice\(0, 3\)/);
});

test('temporal home copy does not promote changes into impact or priority', () => {
  assert.match(home, /no implica impacto, causalidad ni prioridad adicional/);
  assert.doesNotMatch(home, /attention.*change/i);
});
