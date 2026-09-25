import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tsx = fs.readFileSync('components/maintenance/technical-sheet-import.tsx', 'utf8');
const template = fs.readFileSync('components/maintenance/technical-sheet-template.ts', 'utf8');

test('technical sheet import composes its CSV template from an extracted module', () => {
  assert.match(tsx, /import \{ buildTemplateCsv \} from '\.\/technical-sheet-template';/);
  assert.doesNotMatch(tsx, /function buildTemplateCsv/);
  assert.match(template, /export function buildTemplateCsv\(\)/);
  assert.match(template, /const headers = \[/);
  assert.match(template, /return \[headers, \.\.\.rows\]/);
});

test('technical sheet CSV template keeps its canonical columns and escaping', () => {
  assert.match(template, /'ASSET_CODE'/);
  assert.match(template, /'ASSET_NAME'/);
  assert.match(template, /'RAW_SPECS'/);
  assert.match(template, /'COMPONENT_CODE'/);
  assert.match(template, /'FAULT_CODE'/);
  assert.match(template, /replace\(\/"\/g, '""'\)/);
  assert.match(template, /\.join\(';'\)/);
  assert.match(template, /\.join\('\\n'\)/);
});

test('technical sheet import keeps its secure import flow and traceable result', () => {
  assert.match(tsx, /\/api\/maintenance\/technical-sheets\/import/);
  assert.match(tsx, /credentials: 'include'/);
  assert.match(tsx, /Solo aceptamos CSV, XLS o XLSX/);
  assert.match(tsx, /plantilla-fichas-tecnicas\.csv/);
  assert.match(tsx, /Importar fichas tecnicas/);
  assert.match(tsx, /Fichas importadas: \{result\.imported_sheets \|\| 0\}/);
  assert.match(tsx, /Activos omitidos: \{result\.skipped_assets \|\| 0\}/);
  assert.match(tsx, /Total filas: \{result\.total \|\| 0\}/);
  assert.doesNotMatch(tsx, /RAW_SPECS',/);
});
