import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const agents = await readFile(new URL('../AGENTS.md', import.meta.url), 'utf8');
const design = await readFile(new URL('../DESIGN.md', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const workflow = await readFile(new URL('../.github/workflows/production-release-gate.yml', import.meta.url), 'utf8');

test('agents must read DESIGN.md before UI work', () => {
  assert.match(agents, /Read DESIGN\.md before any UI work\./);
  assert.match(agents, /canonical visual contract/);
});

test('DESIGN.md exposes machine-readable MOTIL tokens', () => {
  assert.match(design, /^---\nversion: alpha\nname: MOTIL Mining Operating System/m);
  assert.match(design, /primary: "oklch\(0\.52 0\.11 33\)"/);
  assert.match(design, /fontFamily: Montserrat/);
  assert.match(design, /## Do's and Don'ts/);
});

test('release gate pins and executes the Google DESIGN.md linter', () => {
  assert.equal(pkg.scripts['design:lint'], 'pnpm dlx @google/design.md@0.4.0 lint DESIGN.md');
  assert.match(workflow, /pnpm design:lint/);
});
