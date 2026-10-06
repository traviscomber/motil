import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const uploadComponentUrl = new URL('../components/documents/document-upload.tsx', import.meta.url);
const uploadRouteUrl = new URL('../app/api/documents/upload/route.ts', import.meta.url);
const legalRouteUrl = new URL('../app/api/legal/documentos/route.ts', import.meta.url);
const genericRouteUrl = new URL('../app/api/documents/route.ts', import.meta.url);
const migrationUrl = new URL('../supabase/migrations/20261006020500_unify_canonical_document_core.sql', import.meta.url);

test('all module document uploads use the canonical module-documents endpoint', async () => {
  const component = await readFile(uploadComponentUrl, 'utf8');
  assert.match(component, /fetch\('\/api\/documents\/upload'/);
  assert.doesNotMatch(component, /\/api\/sostenibilidad\/upload-documento/);
  assert.doesNotMatch(component, /isLegalModule/);
});

test('canonical upload preserves source module category and uploader', async () => {
  const route = await readFile(uploadRouteUrl, 'utf8');
  assert.match(route, /formData\.get\('module'\)/);
  assert.match(route, /formData\.get\('category'\)/);
  assert.match(route, /module,/);
  assert.match(route, /category,/);
  assert.match(route, /uploaded_by: auth\.user\.id/);
  assert.match(route, /from\('module_documents'\)/);
});

test('uploaded documents are canonical immediately, never draft', async () => {
  const route = await readFile(uploadRouteUrl, 'utf8');
  assert.match(route, /status: 'active'/);
  assert.match(route, /provenance_status: 'canonical'/);
  assert.match(route, /canonical_role: 'canonical'/);
  assert.doesNotMatch(route, /status: 'draft'/);
  assert.doesNotMatch(route, /provenance_status: 'operational'/);
});

test('legal and generic uploads converge on canonical uploader', async () => {
  const legalRoute = await readFile(legalRouteUrl, 'utf8');
  const genericRoute = await readFile(genericRouteUrl, 'utf8');
  assert.match(legalRoute, /\/api\/documents\/upload/);
  assert.match(genericRoute, /\/api\/documents\/upload/);
});

test('canonical upload and reads are organization scoped', async () => {
  const uploadRoute = await readFile(uploadRouteUrl, 'utf8');
  const listRoute = await readFile(new URL('../app/api/documents/list/route.ts', import.meta.url), 'utf8');
  const listComponent = await readFile(new URL('../components/documents/document-list.tsx', import.meta.url), 'utf8');
  assert.match(uploadRoute, /organization_id: auth\.organizationId/);
  assert.match(uploadRoute, /\.eq\('organization_id', auth\.organizationId\)/);
  assert.match(listRoute, /\.eq\('organization_id', auth\.organizationId\)/);
  assert.match(listComponent, /Fuente canónica/);
});

test('module documents project into transversal documents as approved canonical evidence', async () => {
  const migration = await readFile(migrationUrl, 'utf8');
  assert.match(migration, /status = 'approved'/);
  assert.match(migration, /sync_module_document_to_documents/);
  assert.match(migration, /new\.provenance_status := 'canonical'/);
  assert.match(migration, /new\.canonical_role := 'canonical'/);
});
