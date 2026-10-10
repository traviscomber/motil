'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function MaintenanceTerrainPrepare({ workOrderId }: { workOrderId: string }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function prepare() {
    setBusy(true);
    try {
      if (!/^\d{8}$/.test(pin)) throw new Error('Elige un PIN local de 8 dígitos.');
      if (!navigator.onLine || !('serviceWorker' in navigator)) throw new Error('Prepara la OT con conexión en un navegador compatible.');
      const registration = await navigator.serviceWorker.register('/motil-sw-v2.js', { scope: '/', updateViaCache: 'none' });
      await registration.update();
      const ready = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('No se pudo preparar el modo de terreno. Vuelve a intentar.')), 15000))]);
      if (!ready.active) throw new Error('Espera la actualización de MOTIL y vuelve a intentar.');
      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();
        const timeout = setTimeout(() => reject(new Error('La actualización sigue instalándose. Recarga MOTIL con señal y vuelve a preparar.')), 10000);
        channel.port1.onmessage = event => {
          clearTimeout(timeout);
          channel.port1.close();
          if (event.data?.ready && event.data?.cache === 'motil-offline-shell-v2') resolve();
          else reject(new Error('Actualiza MOTIL antes de preparar la OT.'));
        };
        ready.active!.postMessage({ type: 'GET_TERRAIN_READY' }, [channel.port2]);
      });
      const cache = await caches.open('motil-offline-shell-v2');
      await cache.addAll(['/offline-maintenance.html', '/motil-terrain.mjs', '/motil-terrain-ui.mjs']);
      const response = await fetch(`/api/maintenance/work-orders/${workOrderId}/terrain`, { credentials: 'include', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No tienes permiso para preparar esta OT.');
      const moduleUrl = '/motil-terrain.mjs';
      const terrain = await import(/* webpackIgnore: true */ moduleUrl);
      await terrain.preparePackage(payload, pin);
      setPin('');
      setMessage('OT preparada por 48 horas. Abre Terreno antes de activar modo avión. Conserva tu PIN.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo preparar la OT.'); }
    finally { setBusy(false); }
  }
  return <details className="rounded-lg border p-4">
    <summary className="cursor-pointer text-sm font-semibold">Preparar para trabajar sin señal</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs text-muted-foreground">Ficha básica, instrucciones, notas y fotos en este teléfono durante 48 horas. El PIN protege esta copia local; no es tu contraseña de MOTIL. Cierre y aprobación requieren conexión.</p>
      <label className="block text-sm">PIN local de 8 dígitos<input type="password" inputMode="numeric" autoComplete="off" maxLength={8} value={pin} disabled={busy} onChange={event => setPin(event.target.value)} className="mt-1 block w-full rounded-md border bg-background p-3" /></label>
      <div className="flex flex-wrap gap-2"><Button type="button" disabled={busy} onClick={() => void prepare()}>{busy ? 'Preparando…' : 'Preparar esta OT'}</Button><Button asChild variant="outline"><a href="/offline-maintenance.html">Abrir Terreno</a></Button></div>
      {message ? <p role="status" className="text-sm">{message}</p> : null}
      <p className="text-xs text-muted-foreground">Usa tu teléfono personal. No borres datos del navegador ni desinstales MOTIL con registros pendientes.</p>
    </div>
  </details>;
}
