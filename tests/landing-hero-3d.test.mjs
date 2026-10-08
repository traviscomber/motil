import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const hero = await readFile(new URL('../app/landing-stone.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/landing.css', import.meta.url), 'utf8');

test('MOTIL hero keeps a bounded adaptive geometry budget', () => {
  assert.match(hero, /const geometryDetail = lowPower \? 4 : 5/);
  assert.doesNotMatch(hero, /IcosahedronGeometry\(1,\s*24\)/);
});

test('MOTIL hero uses high-fidelity physical rendering without brute-force subdivision', () => {
  assert.match(hero, /MeshPhysicalMaterial/);
  assert.match(hero, /ACESFilmicToneMapping/);
  assert.match(hero, /SRGBColorSpace/);
  assert.match(hero, /hotVein/);
  assert.match(hero, /copperSurface/);
  assert.match(hero, /totalEmissiveRadiance/);
});

test('MOTIL hero adapts quality and pauses work when not visible', () => {
  assert.match(hero, /lowPower \? 1\.5 : 2/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /IntersectionObserver/);
  assert.match(hero, /visibilitychange/);
  assert.match(hero, /powerPreference: 'high-performance'/);
});

test('MOTIL hero retains an accessible static fallback', () => {
  assert.match(hero, /role="img"/);
  assert.match(hero, /Mineral oscuro de sulfuros de cobre con vetas metálicas/);
  assert.match(hero, /\/brand\/hero-stone\.png/);
});

test('MOTIL hero stage keeps premium depth without layout noise', () => {
  assert.match(css, /width: min\(34vw, 520px\)/);
  assert.match(css, /radial-gradient/);
  assert.match(css, /drop-shadow\(0 34px 38px/);
  assert.match(css, /width: min\(78vw, 390px\)/);
});
