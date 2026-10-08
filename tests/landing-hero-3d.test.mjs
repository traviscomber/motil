import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const hero = await readFile(new URL('../app/landing-stone.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../app/landing.css', import.meta.url), 'utf8');

test('MOTIL hero loads the supplied GLB rather than generating procedural geometry', () => {
  assert.match(hero, /GLTFLoader/);
  assert.match(hero, /\/motil-rock\.glb/);
  assert.match(hero, /loadAsync\(GLB_URL\)/);
  assert.doesNotMatch(hero, /new THREE\.IcosahedronGeometry/);
  assert.doesNotMatch(hero, /rockRadius\(/);
});

test('MOTIL hero preserves original GLB physical materials and normalizes framing', () => {
  assert.match(hero, /gltf\.scene/);
  assert.match(hero, /Box3\(\)\.setFromObject\(model\)/);
  assert.match(hero, /normalizer\.scale\.setScalar/);
  assert.match(hero, /ACESFilmicToneMapping/);
  assert.match(hero, /SRGBColorSpace/);
  assert.doesNotMatch(hero, /material\.onBeforeCompile/);
});

test('MOTIL hero adapts quality and motion safely', () => {
  assert.match(hero, /lowPower \? 1\.35 : 1\.8/);
  assert.match(hero, /prefers-reduced-motion: reduce/);
  assert.match(hero, /IntersectionObserver/);
  assert.match(hero, /visibilitychange/);
  assert.match(hero, /pointermove/);
  assert.match(hero, /Math\.exp\(-4\.2 \* delta\)/);
  assert.match(hero, /Math\.sin\(elapsed \* 0\.8\) \* 0\.035/);
});

test('MOTIL hero retains accessible static fallback when WebGL or GLB loading fails', () => {
  assert.match(hero, /role="img"/);
  assert.match(hero, /Roca mineral tridimensional de MOTIL/);
  assert.match(hero, /\/brand\/hero-stone\.png/);
  assert.match(hero, /setFallback\(true\)/);
});

test('MOTIL hero stage retains premium responsive layout', () => {
  assert.match(css, /width: min\(36vw, 560px\)/);
  assert.match(css, /grid-template-columns: minmax\(0, 1\.16fr\) minmax\(220px, 0\.84fr\)/);
  assert.match(css, /width: min\(34vw, 310px\)/);
  assert.match(css, /width: min\(78vw, 390px\)/);
});
