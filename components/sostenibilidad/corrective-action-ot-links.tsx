'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'No fue posible consultar OT vinculadas');
  return result;
};

export function CorrectiveActionOtLinks({ actionId }: { actionId: string }) {
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const url = `/api/sostenibilidad/corrective-actions/work-orders?correctiveActionId=${encodeURIComponent(actionId)}`;
  const { data, error, mutate } = useSWR<{ data: Array<{ id: string; work_order_id: string; maintenance_work_orders: { work_order_number: string; status: string } | null }> }>(url, fetcher, { revalidateOnFocus: false });

  async function link() {
    const value = number.trim();
    if (!value || busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/sostenibilidad/corrective-actions/work-orders', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correctiveActionId: actionId, workOrderNumber: value }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'No se pudo vincular la OT');
      setNumber('');
      setMessage('OT vinculada. Su aprobación y la verificación HSE siguen siendo independientes.');
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No se pudo vincular la OT');
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-3 rounded-md border px-3 py-2">
      <summary className="min-h-9 cursor-pointer text-sm font-medium">Órdenes de trabajo vinculadas</summary>
      <div className="space-y-2 pb-2 pt-2">
        {error ? <p role="alert" className="text-xs text-destructive">No se pudo consultar las OT vinculadas.</p>
          : <p className="text-xs text-muted-foreground">{data ? `${data.data.length} OT vinculadas` : 'Consultando vínculos…'}</p>}
        {data?.data.length ? <ul className="space-y-1 text-sm" aria-label="OT vinculadas">{data.data.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0"><span className="font-medium">{item.maintenance_work_orders?.work_order_number || 'OT sin número visible'}</span><span className="text-xs text-muted-foreground">{item.maintenance_work_orders?.status || 'Estado no disponible'} · Estado operacional, no verificación HSE</span></li>)}</ul> : null}
        <label className="block text-xs font-medium" htmlFor={`hse-ot-${actionId}`}>Número de OT existente</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input id={`hse-ot-${actionId}`} value={number} onChange={(event) => setNumber(event.target.value)} maxLength={80} placeholder="Número de OT" />
          <Button type="button" variant="outline" disabled={busy || !number.trim() || Boolean(error)} onClick={() => void link()}>
            {busy ? 'Vinculando…' : 'Vincular OT'}
          </Button>
        </div>
        {message ? <p role="status" className="text-xs">{message}</p> : null}
      </div>
    </details>
  );
}
