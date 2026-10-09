'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DB_NAME = 'motil-maintenance-offline-v1';
const STORE = 'drafts';
type Draft = { id: string; notes: string; updatedAt: string; queue?: Array<{ operationId: string; notes: string; capturedAt: string }>; journal?: Array<{ operationId: string; action: 'play' | 'pause' | 'resume' | 'terminate'; capturedAt: string; notes: string }> };

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
  const [journal, setJournal] = useState<NonNullable<Draft['journal']>>([]);
  const [pauseReason, setPauseReason] = useState('');

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
      setJournal(draft?.journal || []);
      setSavedAt(draft?.updatedAt || null);
      setLoaded(true);
    }).catch(() => { if (active) { setLoaded(true); setError('El dispositivo no permite guardar borradores locales.'); } });
    return () => { active = false; };
  }, [workOrderId]);

  useEffect(() => {
    if (!loaded) return;
    const timeout = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      void writeDraft({ id: workOrderId, notes, updatedAt, queue, journal }).then(() => {
        setSavedAt(updatedAt);
        setError('');
      }).catch(() => setError('No se pudo guardar el borrador local. Copia el texto antes de salir.'));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [loaded, notes, queue, journal, workOrderId]);

  const localStatus = journal.length ? journal[journal.length - 1].action : null;
  const captureTimerEvent = async (action: 'play' | 'pause' | 'resume' | 'terminate') => {
    if ((action === 'pause' && !pauseReason.trim()) || (action === 'play' && localStatus && localStatus !== 'terminate')) return;
    const next = [...journal, { operationId: crypto.randomUUID(), action, capturedAt: new Date().toISOString(), notes: action === 'pause' ? pauseReason.trim() : '' }];
    try {
      await writeDraft({ id: workOrderId, notes, updatedAt: new Date().toISOString(), queue, journal: next });
      setJournal(next);
      setPauseReason('');
      setError('');
    } catch { setError('No fue posible guardar el evento del reloj en el dispositivo.'); }
  };
  const registerJournal = async () => {
    if (!journal.length) return;
    const summary = journal.map((item) => `${new Date(item.capturedAt).toLocaleString('es-CL')} · ${item.action === 'play' ? 'Inicio' : item.action === 'pause' ? 'Pausa' : item.action === 'resume' ? 'Reanudación' : 'Término'}${item.notes ? ` (${item.notes})` : ''}`).join('\\n');
    const next = [...queue, { operationId: crypto.randomUUID(), capturedAt: journal[0].capturedAt, notes: `Bitácora temporal offline (requiere conciliación del supervisor; NO modifica temporizador oficial):\\n${summary}` }];
    try {
      await writeDraft({ id: workOrderId, notes, updatedAt: new Date().toISOString(), queue: next, journal: [] });
      setQueue(next);
      setJournal([]);
      setError('');
    } catch { setError('No fue posible preparar la bitácora para sincronizar.'); }
  };

  const capture = async () => {
    if (!notes.trim()) return;
    const next = [...queue, { operationId: crypto.randomUUID(), notes: notes.trim(), capturedAt: new Date().toISOString() }];
    try {
      await writeDraft({ id: workOrderId, notes: '', updatedAt: new Date().toISOString(), queue: next, journal });
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
        await writeDraft({ id: workOrderId, notes, updatedAt: new Date().toISOString(), queue: remaining, journal });
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
      <div className="rounded-md border p-3 space-y-2">
        <p className="text-sm font-medium">Bitácora temporal sin conexión</p>
        <p className="text-xs text-muted-foreground">Registra hora de inicio, pausas y término. No modifica el reloj ni cierra la OT oficial hasta conciliación.</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="button" variant="outline" disabled={!loaded || (localStatus !== null && localStatus !== 'terminate')} onClick={() => void captureTimerEvent('play')}>Iniciar local</Button>
          <Button size="sm" type="button" variant="outline" disabled={!loaded || (localStatus !== 'play' && localStatus !== 'resume')} onClick={() => void captureTimerEvent('pause')}>Pausar local</Button>
          <Button size="sm" type="button" variant="outline" disabled={!loaded || localStatus !== 'pause'} onClick={() => void captureTimerEvent('resume')}>Reanudar local</Button>
          <Button size="sm" type="button" variant="outline" disabled={!loaded || !localStatus || localStatus === 'terminate'} onClick={() => void captureTimerEvent('terminate')}>Terminar local</Button>
        </div>
        <input value={pauseReason} onChange={(event) => setPauseReason(event.target.value)} maxLength={500} placeholder="Motivo obligatorio de pausa" aria-label="Motivo de pausa local" className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        <p className="text-xs text-muted-foreground">{journal.length} evento(s) conservado(s) localmente</p>
        <Button size="sm" type="button" disabled={!journal.length || !loaded} onClick={() => void registerJournal()}>Preparar bitácora para sincronizar</Button>
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
