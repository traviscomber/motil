import { listPackages, putPackage, records, unseal, seal, canUseOffline, acknowledge, assertOwner, MAX_PHOTOS } from './motil-terrain.mjs';

const $ = id => document.getElementById(id);
let packages = [];
let active = null;
let releaseLock = null;
let chain = Promise.resolve();
let draftTimer;
let busy = false;
let previews = [];
const message = text => { $('message').textContent = text; };
function connection() { $('connection').textContent = navigator.onLine ? 'Señal disponible · sincronización pendiente de confirmar' : 'Sin conexión · guardando en este teléfono'; }
connection();
window.addEventListener('online', () => { connection(); message('Recuperaste conexión. Pulsa Sincronizar para enviar notas y fotos.'); render(); });
window.addEventListener('offline', () => { connection(); render(); });

function render() {
  previews.forEach(url => URL.revokeObjectURL(url)); previews = [];
  if (!active) { $('editor').hidden = true; return; }
  const { data } = active;
  const valid = canUseOffline(data);
  $('editor').hidden = false;
  $('title').textContent = valid ? data.title : 'Copia de terreno vencida';
  $('asset').textContent = valid ? data.assetName : '';
  $('instructions').textContent = valid ? data.instructions || 'Sin instrucciones adicionales registradas.' : 'Recupera señal y vuelve a preparar la OT.';
  $('validity').textContent = valid ? `Preparada hasta ${new Date(data.expiresAt).toLocaleString('es-CL')}` : 'Los registros pendientes permanecen guardados. Puedes sincronizarlos con tu cuenta.';
  if (!valid) $('notes').value = '';
  $('notes').disabled = !valid || busy;
  ['save-note', 'files', 'start', 'pause', 'resume', 'finish', 'reason', 'save-journal'].forEach(id => { $(id).disabled = !valid || busy; });
  const state = data.journal.at(-1)?.action;
  $('start').disabled ||= Boolean(state && state !== 'terminate');
  $('pause').disabled ||= !['play', 'resume'].includes(state);
  $('resume').disabled ||= state !== 'pause';
  $('finish').disabled ||= !state || state === 'terminate';
  $('save-journal').disabled ||= !data.journal.length;
  $('journal').textContent = valid ? `${data.journal.length} evento(s) guardado(s)` : '';
  $('pending').textContent = `${data.notes.length} nota(s) y ${data.photos.length} foto(s) pendientes de confirmación.`;
  $('sync').disabled = busy || !navigator.onLine || (!data.notes.length && !data.photos.length);
  $('remove').disabled = busy || Boolean(data.notes.length || data.photos.length || data.journal.length || data.draft);
  $('list').querySelectorAll('button').forEach(button => { button.disabled = busy; });
  $('lock').disabled = busy;
  $('photos').replaceChildren();
  if (valid) for (const photo of data.photos) {
    const img = document.createElement('img');
    img.src = photo.dataUrl; img.alt = 'Foto pendiente de sincronización'; $('photos').append(img);
  }
}
function update(fn) {
  const target = active;
  const operation = chain.then(async () => {
    if (!target) throw new Error('Desbloquea una OT primero.');
    const next = fn(structuredClone(target.data));
    const record = await seal(next, target.key, target.record.salt, target.record.id);
    await putPackage(record);
    target.data = next; target.record = record;
  });
  chain = operation.catch(() => {});
  return operation;
}
async function flushDraft() {
  clearTimeout(draftTimer);
  if (active && canUseOffline(active.data) && $('notes').value !== active.data.draft) {
    const draft = $('notes').value;
    await update(data => ({ ...data, draft }));
    $('draft-status').textContent = 'Guardado en este teléfono.';
  }
  await chain;
}
async function run(fn) {
  if (busy) return;
  busy = true; render();
  try { await fn(); }
  catch (error) { message(error.message || 'No se pudo guardar. Conserva el texto y vuelve a intentar.'); }
  finally { busy = false; render(); }
}
function requireValid() {
  if (!active || !canUseOffline(active.data)) throw new Error('La copia venció. Recupera señal y vuelve a preparar la OT. Los registros siguen guardados.');
}
function orderList() {
  $('list').replaceChildren();
  for (const item of packages) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = canUseOffline(item.data) ? item.data.title : 'Copia vencida · recuperar pendientes';
    button.style.cssText = 'display:block;width:100%;text-align:left;margin-bottom:10px';
    button.onclick = () => void run(async () => { await flushDraft(); active = item; $('notes').value = canUseOffline(item.data) ? item.data.draft : ''; $('draft-status').textContent = ''; render(); });
    $('list').append(button);
  }
}
$('unlock').onsubmit = async event => {
  event.preventDefault();
  const pin = $('pin').value;
  $('pin').value = '';
  if (!navigator.locks) { message('Actualiza tu navegador para usar Terreno.'); return; }
  try {
    await navigator.locks.request('motil-terrain-editor', { ifAvailable: true }, async lock => {
      if (!lock) { message('Hay otra pestaña de Terreno abierta. Ciérrala para continuar.'); return; }
      packages = [];
      const all = await listPackages();
      for (const record of all) {
        try { const unlocked = await unseal(record, pin); packages.push({ ...unlocked, record }); }
        catch { /* Packages belonging to another PIN stay encrypted. */ }
      }
      if (!packages.length) { message(all.length ? 'PIN incorrecto o copia no disponible. Los registros permanecen guardados.' : 'No hay OT preparadas. Abre una OT asignada con señal y elige Preparar para trabajar sin señal.'); return; }
      $('unlock').hidden = true; $('orders').hidden = false;
      orderList();
      const routeId = location.pathname.match(/\/ordenes-trabajo\/([0-9a-f-]{36})\/?$/i)?.[1];
      active = packages.find(item => item.data.workOrderId === routeId) || packages[0];
      $('notes').value = canUseOffline(active.data) ? active.data.draft : '';
      message('Terreno desbloqueado. Notas y fotos se guardan cifradas en este teléfono.'); render();
      await new Promise(resolve => { releaseLock = resolve; });
    });
  } catch (error) { message(error.message || 'No se pudo abrir el almacenamiento del teléfono.'); }
};
$('lock').onclick = () => void run(async () => {
  await flushDraft(); packages = []; active = null;
  $('orders').hidden = true; $('unlock').hidden = false; $('notes').value = '';
  releaseLock?.(); releaseLock = null; message('Terreno bloqueado.'); render();
});
$('notes').oninput = () => {
  clearTimeout(draftTimer); $('draft-status').textContent = 'Guardando…';
  draftTimer = setTimeout(() => void run(flushDraft), 350);
};
$('save-note').onclick = () => void run(async () => {
  requireValid();
  await flushDraft();
  if (!active.data.draft.trim()) return;
  const item = { id: crypto.randomUUID(), notes: active.data.draft.trim(), capturedAt: new Date().toISOString() };
  await update(data => ({ ...data, draft: '', notes: [...data.notes, item] }));
  $('notes').value = ''; message('Nota guardada. Pendiente de confirmación del servidor.');
});
async function smallPhoto(file) {
  if (!file.type.startsWith('image/') || !file.size || file.size > 20 * 1024 * 1024) throw new Error('Usa una fotografía válida de hasta 20 MB.');
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('No se pudo leer la foto. Usa JPG o PNG en este navegador.'); }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .8));
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('La foto es demasiado grande. Intenta con una resolución menor.');
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
    return { id: crypto.randomUUID(), fileName: `foto-${Date.now()}.jpg`, mimeType: 'image/jpeg', sizeBytes: blob.size, capturedAt: new Date().toISOString(), dataUrl };
  } finally { bitmap.close(); }
}
$('files').onchange = () => void run(async () => {
  requireValid();
  const files = Array.from($('files').files || []); $('files').value = '';
  await flushDraft(); busy = true; render();
  try {
    for (const file of files) {
      if (active.data.photos.length >= MAX_PHOTOS) throw new Error('Máximo 12 fotos pendientes por OT. Sincroniza antes de agregar más.');
      const photo = await smallPhoto(file); requireValid();
      await update(data => ({ ...data, photos: [...data.photos, photo] }));
    }
    message('Fotos guardadas en este teléfono. Pendientes de sincronización.');
  } finally { busy = false; }
});
for (const [id, action] of [['start', 'play'], ['pause', 'pause'], ['resume', 'resume'], ['finish', 'terminate']]) {
  $(id).onclick = () => void run(async () => {
    requireValid();
    if (action === 'pause' && !$('reason').value.trim()) throw new Error('Indica el motivo de pausa.');
    if (active.data.journal.length >= 30) throw new Error('Guarda esta bitácora antes de registrar más eventos.');
    const event = { id: crypto.randomUUID(), action, capturedAt: new Date().toISOString(), reason: action === 'pause' ? $('reason').value.trim().slice(0, 160) : '' };
    await update(data => ({ ...data, journal: [...data.journal, event] })); $('reason').value = '';
  });
}
$('save-journal').onclick = () => void run(async () => {
  requireValid();
  const labels = { play: 'Inicio', pause: 'Pausa', resume: 'Reanudación', terminate: 'Término' };
  const journal = active.data.journal;
  const notes = 'Bitácora temporal de terreno. Requiere revisión del supervisor; no modifica el reloj oficial.\n' + journal.map(item => `${item.capturedAt} · ${labels[item.action]}${item.reason ? ` (${item.reason})` : ''}`).join('\n');
  if (notes.length > 8000) throw new Error('Bitácora extensa: reduce el texto antes de enviarla.');
  await update(data => ({ ...data, journal: [], notes: [...data.notes, { id: crypto.randomUUID(), notes, capturedAt: journal[0].capturedAt }] }));
});
async function api(path, body) {
  const response = await fetch(path, { credentials: 'include', cache: 'no-store', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || (response.status === 401 || response.status === 403 ? 'Inicia sesión y revisa tus permisos. Los registros siguen guardados.' : 'No se confirmó el envío. Vuelve a intentar.'));
  return payload;
}
$('sync').onclick = () => void run(async () => {
  await flushDraft(); busy = true; render();
  try {
    const viewer = await api('/api/maintenance/viewer-context'); assertOwner(active.data, viewer.offlineScope);
    // Recheck assignment and active state before transferring any local observations.
    await api(`/api/maintenance/work-orders/${active.data.workOrderId}/terrain`);
    const root = `/api/maintenance/work-orders/${active.data.workOrderId}`;
    for (const item of [...active.data.notes]) {
      const ack = await api(`${root}/offline-notes`, { operationId: item.id, notes: item.notes, capturedAt: item.capturedAt });
      if (!ack?.ok || !ack.eventId) throw new Error('El servidor no confirmó la nota.');
      await update(data => acknowledge(data, 'notes', item.id));
    }
    for (const photo of [...active.data.photos]) {
      const metadata = { evidenceId: photo.id, fileName: photo.fileName, mimeType: photo.mimeType, sizeBytes: photo.sizeBytes, capturedAt: photo.capturedAt };
      const prepared = await api(`${root}/evidence`, { action: 'create_upload', ...metadata });
      if (!prepared.alreadyCompleted) {
        const signedUrl = prepared.upload?.signedUrl;
        if (!signedUrl || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/upload\/sign\//i.test(signedUrl)) throw new Error('Respuesta de subida no válida.');
        const blob = await (await fetch(photo.dataUrl)).blob();
        const form = new FormData(); form.append('cacheControl', '3600'); form.append('', blob, photo.fileName);
        const upload = await fetch(signedUrl, { method: 'PUT', headers: { 'x-upsert': 'false' }, body: form });
        if (!upload.ok) {
          const error = await upload.json().catch(() => null);
          if (!/already exists|duplicate/i.test(error?.message || error?.error || '')) throw new Error('La foto no terminó de subir. Permanece guardada.');
        }
        const ack = await api(`${root}/evidence`, { action: 'complete_upload', storagePath: prepared.upload.storagePath, ...metadata });
        if (ack?.evidence?.id !== photo.id) throw new Error('El servidor no confirmó la foto.');
      } else if (prepared.evidenceId !== photo.id) throw new Error('Confirmación de foto no válida.');
      await update(data => acknowledge(data, 'photos', photo.id));
    }
    message('Sincronización confirmada. Las notas y fotos están registradas en la OT.');
  } finally { busy = false; }
});
$('remove').onclick = () => void run(async () => {
  await flushDraft();
  if (active.data.notes.length || active.data.photos.length || active.data.journal.length || active.data.draft) throw new Error('Sincroniza o guarda los registros pendientes antes de retirar esta copia.');
  const id = active.record.id;
  await records(store => store.delete(id), 'readwrite');
  packages = packages.filter(item => item.record.id !== id); active = packages[0] || null;
  $('notes').value = active && canUseOffline(active.data) ? active.data.draft : '';
  orderList(); message('Copia local retirada. La OT oficial permanece intacta.');
});
// BFCache must not retain decrypted field data after leaving the screen.
window.addEventListener('pagehide', () => { packages = []; active = null; $('notes').value = ''; $('photos').replaceChildren(); $('editor').hidden = true; releaseLock?.(); releaseLock = null; });
window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
window.addEventListener('beforeunload', event => {
  if (busy || (active && $('notes').value !== active.data.draft && canUseOffline(active.data))) { event.preventDefault(); event.returnValue = ''; }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && active && !busy) void run(flushDraft); });
setInterval(() => { if (active && !canUseOffline(active.data)) { orderList(); render(); } }, 30000);
