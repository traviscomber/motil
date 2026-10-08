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
  assert.match(hero, /float cavity/);
  assert.match(hero, /discard/);
  assert.match(hero, /coreMaterial/);
  assert.match(hero, /radialPlaneLimit/);
  assert.match(hero, /crownPlane/);
  assert.match(hero, /rightPlane/);
  assert.match(hero, /frontPlane/);
  assert.match(hero, /basePlane/);
  assert.match(hero, /chalcopyrite/);
  assert.match(hero, /bornitePurple/);
  assert.match(hero, /borniteBlue/);
  assert.doesNotMatch(hero, /upperShard/);
  assert.doesNotMatch(hero, /lowerShard/);
  assert.match(hero, /totalEmissiveRadiance/);
});

test('MOTIL hero adapts quality and pauses work when not visible', () => {
  assert.match(hero, /lowPower \? 1\.5 : 2/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /IntersectionObserver/);
  assert.match(hero, /visibilitychange/);
  assert.match(hero, /powerPreference: 'high-performance'/);
  assert.match(hero, /autoRotation \+= dt \* 0\.036/);
  assert.match(hero, /Math\.sin\(elapsed \* 0\.48\) \* 0\.018/);
});

test('MOTIL hero retains an accessible static fallback', () => {
  assert.match(hero, /role="img"/);
  assert.match(hero, /Mineral oscuro de sulfuros de cobre con vetas metálicas/);
  assert.match(hero, /\/brand\/hero-stone\.png/);
});

test('MOTIL hero stage keeps premium depth without layout noise', () => {
  assert.match(css, /width: min\(36vw, 560px\)/);
  assert.match(css, /background: rgba\(185, 87, 50, 0\.13\)/);
  assert.match(css, /filter: blur\(76px\)/);
  assert.match(css, /drop-shadow\(0 34px 38px/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.16fr\) minmax\(220px, 0\.84fr\)/);
  assert.match(css, /width: min\(34vw, 310px\)/);
  assert.match(css, /width: min\(78vw, 390px\)/);
});
