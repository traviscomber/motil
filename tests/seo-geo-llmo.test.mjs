import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sitemap = fs.readFileSync('app/sitemap.ts', 'utf8');
const llms = fs.existsSync('public/llms.txt') ? fs.readFileSync('public/llms.txt', 'utf8') : '';
const home = fs.readFileSync('app/page-home.tsx', 'utf8');

test('sitemap declares hreflang alternates (es-CL canonical, en, x-default) for every page', () => {
  assert.match(sitemap, /alternates: \{ languages: languages\('\/'\) \}/);
  assert.match(sitemap, /alternates: \{ languages: languages\('\/mineria-chile'\) \}/);
  assert.ok((sitemap.match(/alternates: \{ languages: languages\(`\/modulos\/\$\{slug\}`\) \}/g) ?? []).length >= 1);
  assert.match(sitemap, /en: `\$\{baseUrl\}\/en\$\{path\}`/);
  assert.match(sitemap, /'x-default': `\$\{baseUrl\}\$\{path\}`/);
});

test('llms.txt indexes MOTIL entities, module pages and the /en mirror', () => {
  assert.ok(llms.length > 500, 'public/llms.txt must exist and be substantive');
  assert.match(llms, /# MOTIL Mining OS — Sistema Operativo para Minería/);
  assert.match(llms, /Neuralia/);
  assert.match(llms, /https:\/\/www\.motil\.app\/mineria-chile/);
  assert.ok((llms.match(/https:\/\/www\.motil\.app\/modulos\//g) ?? []).length >= 8, 'expected all module pages');
  assert.match(llms, /\/en\/mineria-chile/);
  assert.match(llms, /not a horizontal ERP adapted|No es un ERP horizontal adaptado/);
});

test('home JSON-LD enriches the Organization entity for generative engines', () => {
  assert.match(home, /logo: 'https:\/\/www\.motil\.app\/brand\/motil-wordmark\.png'/);
  assert.match(home, /sameAs: \['https:\/\/www\.n3uralia\.com'\]/);
  assert.match(home, /brand: \{ '@type': 'Brand', name: 'MOTIL'/);
  assert.match(home, /areaServed: \['Chile', 'Peru', 'LATAM'\]/);
});
