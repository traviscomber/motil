import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/page-home.tsx', 'utf8');
const css = fs.readFileSync('app/landing.css', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const stone = fs.readFileSync('app/landing-stone.tsx', 'utf8');

test('landing has exactly four principal sections in canonical order', () => {
  const sections = [...page.matchAll(/data-landing-section="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(sections, ['hero', 'contexto', 'mining', 'latam']);
});

test('landing headings follow the 48px editorial cap', () => {
  assert.match(css, /clamp\(2\.125rem, 1\.3rem \+ 2\.2vw, 3rem\)/);
  assert.match(css, /font-weight: 300;/);
  assert.doesNotMatch(css, /font-size:\s*(5[0-9]|[6-9][0-9])px/);
  assert.doesNotMatch(page, /text-5xl|text-6xl|text-7xl/);
});

test('landing uses the canonical mineral palette and never pure white or gradients', () => {
  for (const color of ['#171715', '#20201d', '#292925', '#393833', '#e8e3d6', '#aaa69c', '#747169', '#874034', '#b95732']) {
    assert.match(css, new RegExp(color.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${color}`);
  }
  assert.doesNotMatch(css, /#fff\b/i);
  assert.doesNotMatch(page, /#fff\b/i);
  assert.doesNotMatch(css, /(#ffffff|rgb\(255,\s*255,\s*255\))/i);
  assert.doesNotMatch(page, /(#ffffff|rgb\(255,\s*255,\s*255\))/i);
  assert.doesNotMatch(css, /gradient/i);
  assert.doesNotMatch(page, /gradient/i);
});

test('landing keeps the sharp geometric button language', () => {
  assert.match(css, /border-radius: 0/);
  assert.doesNotMatch(css, /border-radius:\s*[1-9]/);
});

test('landing typography pairs Manrope headers with Montserrat body', () => {
  assert.match(layout, /Manrope/);
  assert.match(layout, /--font-manrope/);
  assert.match(css, /var\(--font-manrope\)[\s\S]*?font-weight: 300/);
  assert.match(css, /font-family: var\(--font-montserrat\)/);
});

test('landing keeps the working auth entry and canonical CTAs', () => {
  const logins = (page.match(/\/auth\/login/g) || []).length;
  assert.ok(logins >= 3, `expected at least 3 auth entries, got ${logins}`);
  assert.match(page, /#contexto/);
  assert.match(page, /https:\/\/www\.n3uralia\.com/);
  assert.match(page, /Ingresar a MOTIL/);
  assert.match(page, /Conocer el sistema/);
  assert.match(page, /Hablar con N3URALIA/);
});

test('landing hero states one operation one source of truth better decisions', () => {
  assert.match(page, /One operation\./);
  assert.match(page, /One source of truth\./);
  assert.match(page, /Better decisions\./);
  assert.match(page, /Mining Operating System/);
  assert.match(page, /LandingStone/);
  assert.match(stone, /hero-stone\.png/);
});

test('hero stone is a real 3d webgl scene with graceful fallback', () => {
  assert.match(stone, /WebGLRenderer/);
  assert.match(stone, /requestAnimationFrame/);
  assert.match(stone, /prefers-reduced-motion/);
  assert.match(stone, /pointermove/);
  assert.match(stone, /role="img"/);
  assert.match(stone, /domElement/); // WebGL canvas mounted into the stage
  assert.match(stone, /hero-stone\.png/); // no-WebGL fallback
  assert.match(css, /aspect-ratio: 1 \/ 1/);
  assert.doesNotMatch(stone, /setInterval/);
  assert.doesNotMatch(stone, /\bthree\/examples/); // no examples/ addons
  assert.doesNotMatch(stone, /addEventListener\('click'/); // rotation only, no click gimmick
});

test('landing keeps numbered eyebrows and the commercial Chile LATAM section', () => {
  assert.match(page, /01 — One operating context/);
  assert.match(page, /02 — Built for mining/);
  assert.match(page, /03 — Chile \/ LATAM/);
  assert.match(page, /Built in Chile\./);
  assert.match(page, /mining-truck\.jpg/);
  assert.match(page, /latam-stone\.png/);
  assert.match(page, /context-flow\.png/);
});

test('landing preserves structured data for SEO', () => {
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /SoftwareApplication/);
  assert.match(page, /MOTIL Mining OS/);
});
