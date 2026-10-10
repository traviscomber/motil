import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile('app/dashboard/documentos/page.tsx','utf8');
test('document library stays primary and metrics are optional',()=>{
 assert.ok(source.indexOf('<Tabs value={activeTab}')<source.indexOf('data-testid="documents-more-metrics"'));
 assert.match(source,/Ver más · Indicadores documentales/);
 assert.match(source,/Mis aprobaciones/);
 assert.match(source,/Parte de Documentación no pudo actualizarse/);
 assert.match(source,/Subir documento/);
});