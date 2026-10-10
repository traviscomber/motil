// Encrypted, bounded field packages. No session tokens or API responses in Cache Storage.
export const TTL = 48 * 60 * 60 * 1000;
export const MAX_PACKAGES = 10;
export const MAX_PHOTOS = 12;
const DB = 'motil-terrain-v1';
const enc = new TextEncoder();
const dec = new TextDecoder();
export function validatePin(pin) {
  if (!/^\d{8}$/.test(pin)) throw new Error('Usa un PIN local de 8 dígitos.');
}
export async function packageId(scope, id) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${scope}:${id}`))), b => b.toString(16).padStart(2, '0')).join('');
}
export async function deriveKey(pin, salt) {
  validatePin(pin);
  const material = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
export async function seal(data, key, salt, id) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(id) }, key, enc.encode(JSON.stringify(data)));
  return { id, salt, iv, cipher };
}
export async function unseal(record, pin) {
  const key = await deriveKey(pin, record.salt);
  const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: record.iv, additionalData: enc.encode(record.id) }, key, record.cipher);
  return { data: JSON.parse(dec.decode(bytes)), key };
}
export function canUseOffline(data, now = Date.now()) {
  return Number.isFinite(data.expiresAt) && data.expiresAt > now;
}
export function acknowledge(data, kind, id) {
  return { ...data, [kind]: data[kind].filter(item => item.id !== id) };
}
export function assertOwner(data, scope) {
  if (data.scope !== scope) throw new Error('Inicia sesión con la misma cuenta que preparó esta OT. Los registros siguen guardados.');
}
export async function records(operation, mode = 'readonly') {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('packages', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('packages', mode);
      const req = operation(tx.objectStore('packages'));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('No se pudo guardar en este dispositivo.'));
    });
  } finally { db.close(); }
}
export const listPackages = () => records(store => store.getAll());
export const putPackage = record => records(store => store.put(record), 'readwrite');
export async function withTerrainLock(action) {
  if (!navigator.locks) throw new Error('Actualiza el navegador para usar el modo de terreno.');
  return navigator.locks.request('motil-terrain-editor', { ifAvailable: true }, lock => {
    if (!lock) throw new Error('Hay otra pestaña de terreno abierta. Ciérrala antes de continuar.');
    return action();
  });
}
export async function preparePackage(snapshot, pin) {
  validatePin(pin);
  return withTerrainLock(async () => {
    const all = await listPackages();
    const id = await packageId(snapshot.scope, snapshot.workOrderId);
    const existing = all.find(item => item.id === id);
    if (!existing && all.length >= MAX_PACKAGES) throw new Error('Máximo 10 OT preparadas. Retira una ya sincronizada desde Terreno.');
    const salt = existing?.salt || crypto.getRandomValues(new Uint8Array(16));
    let data;
    let key;
    if (existing) {
      try { ({ data, key } = await unseal(existing, pin)); }
      catch { throw new Error('Usa el PIN con que preparaste esta OT. No se sobrescribieron los registros pendientes.'); }
      assertOwner(data, snapshot.scope);
    } else {
      key = await deriveKey(pin, salt);
      data = { draft: '', notes: [], photos: [], journal: [] };
    }
    data = { ...data, ...snapshot, preparedAt: Date.now(), expiresAt: Date.now() + TTL };
    await putPackage(await seal(data, key, salt, id));
    await navigator.storage?.persist?.().catch(() => false);
    return data;
  });
}
