import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const hero = await readFile(new URL('../app/landing-stone.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/landing.css', import.meta.url), 'utf8');

test('MOTIL hero is assembled from explicit mineral layers', () => {
  assert.match(hero, /const stoneLayer = new THREE\.Group\(\)/);
  assert.match(hero, /const sulfideLayer = new THREE\.Group\(\)/);
  assert.match(hero, /const veinLayer = new THREE\.Group\(\)/);
  assert.match(hero, /const coreLayer = new THREE\.Group\(\)/);
  assert.match(hero, /assembly\.add\(coreLayer, veinLayer, stoneLayer, sulfideLayer\)/);
  assert.doesNotMatch(hero, /IcosahedronGeometry\(1,/);
});

test('MOTIL hero uses distinct physical materials for graphite and copper sulfides', () => {
  assert.match(hero, /MeshPhysicalMaterial/);
  assert.match(hero, /const graphite =/);
  assert.match(hero, /const chalcopyrite =/);
  assert.match(hero, /const bornite =/);
  assert.match(hero, /const veinMaterial =/);
  assert.match(hero, /const coreMaterial =/);
  assert.match(hero, /ACESFilmicToneMapping/);
  assert.match(hero, /SRGBColorSpace/);
});

test('MOTIL hero creates art-directed slabs, veins, sulfides and inner bodies', () => {
  assert.match(hero, /const slabData = \[/);
  assert.match(hero, /const veinData = \[/);
  assert.match(hero, /const sulfideData = \[/);
  assert.match(hero, /makeJaggedSlab/);
  assert.match(hero, /makeCrystal/);
  assert.match(hero, /DodecahedronGeometry/);
});

test('MOTIL hero keeps subtle layered parallax rather than noisy motion', () => {
  assert.match(hero, /autoRotation \+= dt \* 0\.027/);
  assert.match(hero, /stoneLayer\.rotation\.z/);
  assert.match(hero, /sulfideLayer\.rotation\.z/);
  assert.match(hero, /veinLayer\.rotation\.y/);
  assert.match(hero, /coreLayer\.rotation\.x/);
  assert.match(hero, /POINTER_TILT_RAD = 0\.085/);
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
  assert.match(hero, /Mineral de sulfuros de cobre construido por capas/);
  assert.match(hero, /\/brand\/hero-stone\.png/);
});

test('MOTIL hero stage keeps premium depth without layout noise', () => {
  assert.match(css, /width: min\(36vw, 560px\)/);
  assert.match(css, /background: rgba\(185, 87, 50, 0\.13\)/);
  assert.match(css, /filter: blur\(76px\)/);
  assert.match(css, /drop-shadow\(0 34px 38px/);
});
