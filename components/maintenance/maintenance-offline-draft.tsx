'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DB_NAME = 'motil-maintenance-offline-v1';
const STORE = 'drafts';
type Draft = { id: string; notes: string; updatedAt: string; queue?: Array<{ operationId: string; notes: string; capturedAt: string }> };

async function draftsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDraft(id: string): Promise<Draft | undefined> {
  const db = await draftsDB();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result as Draft | undefined);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}

async function writeDraft(draft: Draft): Promise<void> {
  const db = await draftsDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(draft);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

/** Phase 1: local capture only. Never replay timer/closure mutations without server idempotency. */
export function MaintenanceOfflineDraft({ workOrderId }: { workOrderId: string }) {
  const [online, setOnline] = useState(true);
  const [notes, setNotes] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<NonNullable<Draft['queue']>>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const connected = () => setOnline(true);
    const disconnected = () => setOnline(false);
    window.addEventListener('online', connected);
    window.addEventListener('offline', disconnected);
    return () => { window.removeEventListener('online', connected); window.removeEventListener('offline', disconnected); };
  }, []);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    void readDraft(workOrderId).then((draft) => {
      if (!active) return;
      setNotes(draft?.notes || '');
      setQueue(draft?.queue || []);
      setSavedAt(draft?.updatedAt || null);
      setLoaded(true);
    }).catch(() => { if (active) { setLoaded(true); setError('El dispositivo no permite guardar borradores locales.'); } });
    return () => { active = false; };
  }, [workOrderId]);

  useEffect(() => {
    if (!loaded) return;
    const timeout = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      void writeDraft({ id: workOrderId, notes, updatedAt, queue }).then(() => {
        setSavedAt(updatedAt);
        setError('');
      }).catch(() => setError('No se pudo guardar el borrador local. Copia el texto antes de salir.'));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [loaded, notes, queue, workOrderId]);

  const capture = async () => {
    if (!notes.trim()) return;
    const next = [...queue, { operationId: crypto.randomUUID(), notes: notes.trim(), capturedAt: new Date().toISOString() }];
    try {
      await writeDraft({ id: workOrderId, notes: '', updatedAt: new Date().toISOString(), queue: next });
      setQueue(next);
      setNotes('');
      setError('');
    } catch { setError('No se pudo guardar en este dispositivo. Conserva el texto.'); }
  };

  const synchronize = async () => {
    if (!navigator.onLine || syncing || !queue.length) return;
    setSyncing(true);
    try {
      let remaining = [...queue];
      for (const item of queue) {
        const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/offline-notes`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        if (!response.ok) {
          setError(response.status === 401 || response.status === 403 ? 'Inicia sesión o revisa tus permisos para sincronizar.' : 'Sincronización pendiente; vuelve a intentar.');
          break;
        }
        remaining = remaining.filter((entry) => entry.operationId !== item.operationId);
        // Persist the acknowledged queue before updating the UI.
        await writeDraft({ id: workOrderId, notes, updatedAt: new Date().toISOString(), queue: remaining });
        setQueue(remaining);
      }
    } catch { setError('Sin conexión con el servidor. Se conservaron las notas pendientes.'); }
    finally { setSyncing(false); }
  };

  useEffect(() => {
    if (loaded && online && queue.length && !syncing) void synchronize();
    // One attempt per connectivity/queue change; server confirms each removal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, loaded]);

  return (
    <Card className="space-y-3 p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Notas de faena · borrador local</h3>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">{online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{online ? 'Con conexión' : 'Sin conexión'}</span>
      </div>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!loaded} maxLength={8000} rows={4} placeholder="Registrar observaciones durante la intervención, incluso sin señal…" className="w-full rounded-md border bg-background p-3 text-sm" aria-label="Notas locales de la orden de trabajo" />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{savedAt ? `Guardado en este dispositivo: ${new Date(savedAt).toLocaleString('es-CL')}` : 'Borrador local pendiente'}</p>
        <Button type="button" variant="outline" size="sm" disabled={!notes || !navigatorClipboardAvailable()} onClick={() => void navigator.clipboard.writeText(notes)}><Copy className="mr-1 h-3 w-3" />Copiar</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={!notes.trim() || !loaded} onClick={() => void capture()}>Guardar nota para sincronizar</Button>
        <Button type="button" variant="outline" size="sm" disabled={!online || !queue.length || syncing} onClick={() => void synchronize()}>{syncing ? 'Sincronizando…' : `Sincronizar (${queue.length})`}</Button>
      </div>
      <p className="text-xs text-amber-700 dark:text-amber-400">{queue.length ? `${queue.length} nota(s) guardada(s) localmente, pendiente(s) de confirmación del servidor.` : 'Las notas enviadas se incorporan a la trazabilidad de la OT.'} No guardes información sensible en dispositivos compartidos.</p>
      {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
    </Card>
  );
}

function navigatorClipboardAvailable() { return typeof navigator !== 'undefined' && Boolean(navigator.clipboard); }
