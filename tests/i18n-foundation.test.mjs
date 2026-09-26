import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const proxy = fs.readFileSync('proxy.ts', 'utf8');
const dictModule = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');
const serverModule = fs.readFileSync('lib/i18n/server.ts', 'utf8');
const layout = fs.readFileSync('app/layout.tsx', 'utf8');

assert.ok(!fs.existsSync('middleware.ts'), 'middleware.ts must not exist; locale routing lives in proxy.ts (Next 16)');

// Extrae los diccionarios transpilando el módulo real con el TypeScript del repo
// y evaluando el objeto en un contexto aislado.
function loadDictionaries() {
  const ts = require('typescript');
  const source = fs.readFileSync('lib/i18n/dictionaries.ts', 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module_ = { exports: {} };
  new Function('module', 'exports', 'require', js)(module_, module_.exports, require);
  return module_.exports.dictionaries;
}

function keyPaths(obj, prefix = '') {
  const paths = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') paths.push(...keyPaths(value, path));
    else paths.push(path);
  }
  return paths.sort();
}

test('i18n dictionaries es/en have strict key parity', () => {
  const dictionaries = loadDictionaries();
  assert.ok(dictionaries.es, 'missing es dictionary');
  assert.ok(dictionaries.en, 'missing en dictionary');
  const esKeys = keyPaths(dictionaries.es);
  const enKeys = keyPaths(dictionaries.en);
  assert.deepEqual(enKeys, esKeys, 'dictionary key mismatch between es and en');
  assert.ok(esKeys.length > 0, 'dictionaries must not be empty');
});

test('locale routing in proxy: /en rewrites with header+cookie, /es redirects to default', () => {
  assert.match(proxy, /NextResponse\.rewrite\(targetUrl, \{ request: \{ headers: requestHeaders \} \}\)/);
  assert.match(proxy, /requestHeaders\.set\(LOCALE_HEADER, 'en'\)/);
  assert.match(proxy, /cookies\.set\(LOCALE_COOKIE, 'en'/);
  assert.match(proxy, /NextResponse\.redirect\(url\)/);
  assert.match(proxy, /\/\^\\\/es\//);
  assert.match(proxy, /\/\^\\\/en\//);
  assert.match(proxy, /async function proxyRequest\(request: NextRequest\)/);
});

test('root layout renders a dynamic html lang from the request locale', () => {
  assert.match(layout, /getLocale\(\)/);
  assert.match(layout, /lang=\{locale === 'en' \? 'en' : 'es-CL'\}/);
  assert.doesNotMatch(layout, /<html lang="es-CL"/);
});

test('server locale helper prefers header, falls back to cookie with es default', () => {
  assert.match(serverModule, /headers\(\)/);
  assert.match(serverModule, /LOCALE_HEADER/);
  assert.match(serverModule, /cookies\(\)/);
  assert.match(serverModule, /LOCALE_COOKIE/);
  assert.match(serverModule, /DEFAULT_LOCALE/);
});
