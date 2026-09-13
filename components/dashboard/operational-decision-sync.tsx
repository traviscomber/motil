'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SyncResult = {
  created?: number;
  revalidated?: number;
  archived?: number;
  active?: number;
};

async function runSync(url: string): Promise<SyncResult> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  const payload = (await response.json().catch(() => null)) as (SyncResult & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error || 'No fue posible sincronizar los casos operacionales.');
  return payload || {};
}

export function OperationalDecisionSync() {
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = async () => {
    if (syncing) return;
    setSyncing(true);
    setNotice(null);
    setError(null);
    try {
      const [core, hse] = await Promise.all([
        runSync('/api/intelligence/decision-cases/sync'),
        runSync('/api/intelligence/decision-cases/sync-hse'),
      ]);
      const active = (core.active ?? 0) + (hse.active ?? 0);
      const created = (core.created ?? 0) + (hse.created ?? 0);
      const revalidated = (core.revalidated ?? 0) + (hse.revalidated ?? 0);
      const archived = (core.archived ?? 0) + (hse.archived ?? 0);
      setNotice(`${active} caso(s) vigentes · ${created} nuevo(s) · ${revalidated} revalidado(s) · ${archived} resuelto(s)/archivado(s).`);
      window.dispatchEvent(new Event('motil:decision-cases-synced'));
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible sincronizar los casos operacionales.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between" aria-label="Sincronización de casos operacionales">
      <div>
        <p className="text-sm font-medium">Prioridades operacionales persistentes</p>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
          Revalida Mantención, Geología, Inventario, Compras, Producción, Finanzas y HSE contra evidencia canónica. Sólo crea casos advisory; no ejecuta cambios operacionales.
        </p>
        {notice ? <p className="mt-1 text-xs text-muted-foreground">{notice}</p> : null}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => void sync()} disabled={syncing}>
        <RefreshCw className={`mr-2 size-4 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Revalidando…' : 'Revalidar prioridades'}
      </Button>
    </section>
  );
}
