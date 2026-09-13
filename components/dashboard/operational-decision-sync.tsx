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
      const response = await fetch('/api/intelligence/decision-cases/sync', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = (await response.json().catch(() => null)) as (SyncResult & { error?: string }) | null;
      if (!response.ok) throw new Error(payload?.error || 'No fue posible sincronizar los casos operacionales.');
      setNotice(`${payload?.active ?? 0} caso(s) vigentes · ${payload?.created ?? 0} nuevo(s) · ${payload?.revalidated ?? 0} revalidado(s) · ${payload?.archived ?? 0} resuelto(s)/archivado(s).`);
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
          Revalida preventiva por horómetro, bloqueos de cierre de OT y brechas geológicas contra evidencia canónica. Sólo crea casos advisory; no ejecuta cambios operacionales.
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
