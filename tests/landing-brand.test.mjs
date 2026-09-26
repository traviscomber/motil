import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/page-home.tsx', 'utf8');
const css = fs.readFileSync('app/landing.css', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');
const stone = fs.readFileSync('app/landing-stone.tsx', 'utf8');
const dict = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');

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
  // No color gradients anywhere. Alpha masks (mask-image) are exempt: they fade
  // an image into the background without rendering a gradient.
  const cssNoMasks = css.replace(/-webkit-mask-image:[^;]+;|mask-image:[^;]+;/g, '');
  assert.doesNotMatch(cssNoMasks, /gradient/i);
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
  // Locale-dependent chrome lives in the i18n dictionary, not in the JSX.
  assert.match(page, /getDictionaryForRequest/);
  assert.doesNotMatch(page, /Ingresar a MOTIL|Conocer el sistema|Hablar con N3URALIA/);
  assert.match(dict, /Ingresar a MOTIL/);
  assert.match(dict, /Conocer el sistema/);
  assert.match(dict, /Hablar con N3URALIA/);
  assert.match(dict, /Sign in to MOTIL/);
  assert.match(dict, /Explore the system/);
  assert.match(dict, /Talk to N3URALIA/);
  assert.match(dict, /Camión de acarreo minero/);
  assert.match(dict, /Mining haul truck/);
});

test('landing exposes a language switch between /es default and /en', () => {
  const switchComponent = fs.readFileSync('components/landing/language-switch.tsx', 'utf8');
  assert.match(page, /LanguageSwitch/);
  assert.match(page, /dict\.common\.languageSwitch/);
  assert.match(page, /locale === 'en' \? '\/' : '\/en'/);
  assert.match(page, /Switch to English/);
  assert.match(page, /Cambiar a español/);
  // The switcher must force a full document navigation: client-side RSC
  // fetches to /en return empty diffs under the proxy rewrite in production,
  // and the App Router soft-navigates even plain anchors, leaving the old
  // locale's DOM in place. preventDefault + location.assign bypasses it.
  assert.match(switchComponent, /className="ld-lang-switch"/);
  assert.match(switchComponent, /preventDefault\(\)/);
  assert.match(switchComponent, /window\.location\.assign\(href\)/);
  assert.match(css, /\.ld-lang-switch \{[\s\S]*?border: 1px solid var\(--ld-line\)/);
});

test('landing hero copy is locale-aware (es default, en for /en)', () => {
  // es
  assert.match(dict, /Una operación\./);
  assert.match(dict, /Una sola fuente de verdad\./);
  assert.match(dict, /Mejores decisiones\./);
  assert.match(dict, /Sistema Operativo para Minería/);
  // en
  assert.match(dict, /One operation\./);
  assert.match(dict, /One source of truth\./);
  assert.match(dict, /Better decisions\./);
  assert.match(dict, /Mining Operating System/);
  // The page must render hero copy from the dictionary, not hardcode it.
  assert.doesNotMatch(page, /One operation\.|Una operación\./);
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
  assert.doesNotMatch(stone, /\bclick\b/); // rotation only, no click gimmick
  assert.doesNotMatch(stone, /setInterval/);
  assert.doesNotMatch(stone, /\bthree\/examples/); // no examples/ addons
  assert.doesNotMatch(stone, /addEventListener\('click'/); // rotation only, no click gimmick
});

test('landing keeps numbered eyebrows and the commercial Chile LATAM section', () => {
  // es default
  assert.match(dict, /01 — Un solo contexto operacional/);
  assert.match(dict, /02 — Construido para minería/);
  assert.match(dict, /03 — Chile \/ LATAM/);
  assert.match(dict, /Construido en Chile\./);
  assert.match(dict, /Diseñado para /);
  // en
  assert.match(dict, /01 — One operating context/);
  assert.match(dict, /02 — Built for mining/);
  assert.match(dict, /Built in Chile\./);
  assert.match(dict, /Designed for /);
  // Editorial copy must come from the dictionary, not the JSX.
  assert.doesNotMatch(page, /One operating context|Built for mining|Built in Chile\.|Operaciones reales\./);
  assert.match(page, /mining-truck\.webp/);
  assert.match(page, /latam-stone\.webp/);
  assert.match(page, /context-flow\.webp/);
  assert.doesNotMatch(page, /context-flow\.png|latam-stone\.png|mining-truck\.jpg/);
});

test('landing preserves structured data for SEO', () => {
  assert.match(page, /application\/ld\+json/);
  assert.match(page, /SoftwareApplication/);
  assert.match(page, /MOTIL Mining OS/);
});
