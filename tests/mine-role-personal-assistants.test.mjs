import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const persona = await readFile(new URL('../lib/intelligence/mine-role-assistant.ts', import.meta.url), 'utf8');
const api = await readFile(new URL('../app/api/intelligence/mine-role-assistant/route.ts', import.meta.url), 'utf8');
const widget = await readFile(new URL('../components/intelligence/senior-assistant-widget.tsx', import.meta.url), 'utf8');
const chat = await readFile(new URL('../components/intelligence/specialist-assistant-body.tsx', import.meta.url), 'utf8');
const history = await readFile(new URL('../lib/intelligence/core-conversation.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/20261009173000_mine_role_assistants.sql', import.meta.url), 'utf8');

test('mine assistants are identity-bound and based on verified cargo and active session', () => {
  for (const name of ['Jaime Manques','Cristian Rubio','Joaquín Martínez']) assert.match(persona, new RegExp(name));
  for (const cargo of ['JEFE MINA PEUMO','JEFE MINA DON JAIME','Jefe de Taller Mina Don Jaime'])
    assert.match(persona, new RegExp(cargo));
  assert.match(persona, /profile\.status !== 'active'/);
  assert.match(persona, /cargo\?\.name !== expected\.cargoName/);
  assert.match(persona, /context\.userId/);
  assert.match(persona, /MODULE_KEYS\.MANT_OPERACIONES/);
  assert.match(api, /resolveMineAssistantPersona\(context\)/);
  assert.doesNotMatch(api, /body\.mine|body\?\.mine|searchParams\.get\('mine'\)/);
});

test('data retrieval is mine and tenant scoped in every dataset', () => {
  assert.match(persona, /\.eq\('organization_id',org\)\.eq\('workshop_site',mine\)/);
  assert.match(persona, /\.eq\('organization_id',org\)\.eq\('canonical_mine_source_id',mineId\)/);
  assert.match(persona, /\.eq\('organization_id',org\)\.eq\('mine_source_id',mineId\)/);
  assert.match(persona, /\.eq\('organization_id',org\)\.in\('location',\[mine,'Mina '\+mine\]\)/);
  assert.match(persona, /\.eq\('organization_id',org\)\.ilike\('location','%'\+mine\+'%'\)/);
  assert.match(persona, /\.eq\('organization_id',org\)\.eq\('user_id',persona\.profileId\)/);
  assert.match(persona, /persona\.kind === 'mine_manager'/);
  assert.match(persona, /MODULE_KEYS\.HSE_INCIDENTE/);
  assert.match(persona, /hseAccess === 'ED' \|\| hseAccess === 'LEC'/);
  assert.match(persona, /source:'not_authorized'/);
  assert.match(persona, /if \(result\.error\) throw new Error/);
});

test('source-bound answers and reports cannot claim blind access or execute work orders', () => {
  assert.match(api, /No inventes tonelajes/);
  assert.match(api, /Un plan antiguo es HISTÓRICO/);
  assert.match(api, /NO CANÓNICA|NO CONFIABLES/);
  assert.match(api, /renderMineReport/);
  assert.match(api, /operationalMutationExecuted:false/);
  assert.match(api, /PRIVATE_HEADERS/);
  assert.match(persona, /fuente ausente o atrasada no equivale a cero/);
  assert.doesNotMatch(api, /update\(\{\s*status:\s*'completed'/);
});

test('private domain memory and human-confirmed requests are isolated from production', () => {
  assert.match(history, /\| 'mine_role'/);
  for (const table of ['motil_ai_conversations','motil_ai_messages','motil_ai_user_memory'])
    assert.match(migration, new RegExp('alter table public\\.'+table+' drop constraint'));
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on public\.mine_assistant_requests from public,anon,authenticated/);
  assert.match(migration, /unique \(organization_id, user_id, source_message_id\)/);
  assert.match(api, /body\?\.action==='create_request'/);
  assert.match(api, /\.eq\('domain','mine_role'\)\.eq\('role','assistant'\)/);
  assert.match(api, /await registerRequest\(access/);
  assert.match(api, /requiresReview:true/);
  assert.doesNotMatch(api, /from\('work_order_parts'\).*insert/);
});

test('role widget shows a personal assistant and explicit report/request controls', () => {
  assert.match(widget, /'jefe mina peumo'/);
  assert.match(widget, /'jefe mina don jaime'/);
  assert.match(widget, /'jefe de taller mina don jaime'/);
  assert.match(widget, /mineAssistant \|\| engineeringAssistant \|\| regularSpecialist/);
  assert.match(chat, /generateMineReport\(7\)/);
  assert.match(chat, /generateMineReport\(30\)/);
  assert.match(chat, /downloadMineReport/);
  assert.match(chat, /registerMineRequest/);
  assert.match(chat, /sourceMessageId: item\.id/);
  assert.match(chat, /Solicitud registrada · pendiente de revisión/);
});
